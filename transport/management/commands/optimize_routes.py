import requests
from django.conf import settings
from django.db import transaction
from django.core.management.base import BaseCommand
from students.models import StudentProfile
from transport.models import Route
from django.db.models import Count

# --- CONFIGURATION (Unchanged) ---
BUS_CAPACITY = 5 
ORS_API_KEY = settings.ORS_API_KEY
COLLEGE_COORDS = settings.COLLEGE_COORDS
ORS_MATRIX_ENDPOINT = 'https://api.openrouteservice.org/v2/matrix/driving-car'

class Command(BaseCommand):
    help = 'Optimizes routes. First fills empty slots, then creates new routes.'

    # --- HELPER 1: Get Driving Times (Unchanged) ---
    def get_driving_times(self, college_loc, student_locs):
        try:
            locations = [college_loc] + student_locs
            body = {"locations": locations, "metrics": ["duration"], "sources": ["0"]}
            headers = {'Authorization': ORS_API_KEY, 'Content-Type': 'application/json'}
            
            self.stdout.write(self.style.NOTICE("...Calling ORS API for driving times..."))
            res = requests.post(ORS_MATRIX_ENDPOINT, json=body, headers=headers)
            res.raise_for_status()
            data = res.json()
            durations = data['durations'][0][1:] 
            return durations
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ORS API Error: {e}"))
            return None

    # --- HELPER 2: Re-sorts a single route (NEW) ---
    @transaction.atomic
    def re_sort_route(self, route):
        """
        Takes a route, gets all its students, re-calculates their
        driving times, and updates their pickup_order.
        """
        self.stdout.write(f"Re-sorting route: {route.name}...")
        
        students_on_route = list(StudentProfile.objects.filter(route=route))
        if not students_on_route:
            return # Should not happen, but good to check

        # 1. Get locations
        college_loc = [COLLEGE_COORDS['longitude'], COLLEGE_COORDS['latitude']]
        student_locs = [[s.longitude, s.latitude] for s in students_on_route]

        # 2. Get driving times
        driving_times = self.get_driving_times(college_loc, student_locs)
        if not driving_times:
            self.stdout.write(self.style.ERROR(f"Could not re-sort {route.name}. Skipping."))
            return

        # 3. Pair students with times
        student_time_pairs = list(zip(students_on_route, driving_times))
        
        # 4. Sort by time (farthest first)
        student_time_pairs.sort(key=lambda x: x[1], reverse=True)
        
        # 5. Update pickup_order
        for index, (student, time) in enumerate(student_time_pairs):
            order = index + 1
            student.pickup_order = order
            student.driving_time_seconds = time
            student.save()
            
        self.stdout.write(f"Successfully re-sorted {route.name}.")

    # --- MAIN FUNCTION (New Logic) ---
    @transaction.atomic
    def handle(self, *args, **options):
        # Get all unassigned students
        unassigned_students = list(StudentProfile.objects.filter(
            route__isnull=True,
            latitude__isnull=False
        ))
        
        if not unassigned_students:
            self.stdout.write(self.style.SUCCESS("No unassigned students found."))
            return
            
        self.stdout.write(f"Found {len(unassigned_students)} unassigned student(s).")

        # --- STAGE 1: FILL EMPTY SLOTS ---
        self.stdout.write("--- Stage 1: Filling empty slots ---")
        
        # Find routes with fewer than 5 students
        routes_with_slots = Route.objects.annotate(
            student_count=Count('students')
        ).filter(
            student_count__lt=BUS_CAPACITY
        ).order_by('student_count') # Start with the least full routes first

        if not routes_with_slots:
            self.stdout.write("No existing routes have empty slots.")
        else:
            for route in routes_with_slots:
                # Get the number of empty slots
                current_count = route.student_count
                slots_to_fill = BUS_CAPACITY - current_count
                
                # Get students from the waitlist to fill these slots
                students_to_add = unassigned_students[:slots_to_fill]
                
                if not students_to_add:
                    self.stdout.write("No more unassigned students to fill slots.")
                    break # Stop looping through routes if waitlist is empty

                self.stdout.write(f"Adding {len(students_to_add)} student(s) to {route.name}...")

                # Assign students to the route
                for student in students_to_add:
                    student.route = route
                    student.save()
                
                # Re-sort the *entire* route with the new student(s)
                self.re_sort_route(route)
                
                # Remove the students we just added from the waitlist
                unassigned_students = unassigned_students[len(students_to_add):]

        # --- STAGE 2: CREATE NEW ROUTES ---
        self.stdout.write("--- Stage 2: Checking for new routes ---")
        
        num_remaining = len(unassigned_students)

        if num_remaining == 0:
            self.stdout.write(self.style.SUCCESS(
                "All unassigned students were added to existing routes. No new routes needed."
            ))
            return # Exit the script successfully
        # --- END FIX ---
            
        # If we are here, it means there are still students left over.
        # Now we check if there are enough for a *new* route.
        if num_remaining < BUS_CAPACITY:
            self.stdout.write(self.style.WARNING(
                f"Waiting for more students. "
                f"Need {BUS_CAPACITY}, currently have {num_remaining}."
            ))
            return
            
        # We have enough to create at least one new route
        self.stdout.write(f"{num_remaining} students remain. Creating new route(s)...")
        
        students_to_assign = unassigned_students[:BUS_CAPACITY]
        
        # (This is the same logic as our old script)
        college_loc = [COLLEGE_COORDS['longitude'], COLLEGE_COORDS['latitude']]
        student_locs = [[s.longitude, s.latitude] for s in students_to_assign]
        
        driving_times = self.get_driving_times(college_loc, student_locs)
        
        if driving_times:
            student_time_pairs = list(zip(students_to_assign, driving_times))
            student_time_pairs.sort(key=lambda x: x[1], reverse=True)
            
            route_name = f"Route {chr(65 + Route.objects.count())}"
            new_route = Route.objects.create(name=route_name)
            
            self.stdout.write(f"Created {new_route.name}. Assigning students...")
            
            for index, (student, time) in enumerate(student_time_pairs):
                order = index + 1
                student.route = new_route
                student.pickup_order = order
                student.driving_time_seconds = time
                student.save()
            
            self.stdout.write(self.style.SUCCESS(f"New route {new_route.name} created."))
        
        self.stdout.write(self.style.SUCCESS(f"Optimization complete."))