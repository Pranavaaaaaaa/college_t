# unassigned/admin.py
from django.contrib import admin
from django.urls import path, reverse
from django.http import HttpResponseRedirect
from django.core.management import call_command
from django.contrib import messages
from io import StringIO
from .models import UnassignedStudent

@admin.register(UnassignedStudent)
class UnassignedStudentAdmin(admin.ModelAdmin):
    # 1. This is the custom template we'll create next
    change_list_template = "admin/unassigned_changelist.html"

    # 2. These are the columns we want to see in the list
    list_display = ('username', 'student_id', 'address', 'date_joined')

    def get_queryset(self, request):
        # 3. This is the core logic:
        # Only show students who are unassigned AND have a location set.
        return super().get_queryset(request).filter(
            route__isnull=True,
            latitude__isnull=False,
            user__is_staff=False
        ).select_related('user')

    # 4. Helper functions to get data from the related User model
    def username(self, obj):
        return obj.user.username
    def date_joined(self, obj):
        return obj.user.date_joined

    # 5. Make this entire page read-only
    # You can't add, change, or delete from this view.
    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False

    # 6. Add our custom "Optimize Routes" button
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'trigger-optimization/',
                self.admin_site.admin_view(self.trigger_optimization_view),
                name='unassigned-trigger-optimization'
            ),
        ]
        return custom_urls + urls

    # 7. This view runs when the button is pressed
    def trigger_optimization_view(self, request):
        try:
            out = StringIO() # Capture the output
            call_command('optimize_routes', stdout=out)
            # Show the script's output as a success message
            messages.success(request, out.getvalue())
        except Exception as e:
            messages.error(request, f"Error running optimization: {e}")

        # Redirect back to the list page
        return HttpResponseRedirect(reverse('admin:unassigned_unassignedstudent_changelist'))