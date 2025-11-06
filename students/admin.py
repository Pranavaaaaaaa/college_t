from django.contrib import admin
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin
from .models import StudentProfile, StudentAccount 
from datetime import timedelta

# This removes the "View Site" link from the top
admin.site.site_url = None

# This removes the "Groups" tab from the admin
admin.site.unregister(Group)

# This is the inline profile that shows up inside the user
class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False
    verbose_name_plural = 'Student Profile'
    fk_name = 'user'
    
    # --- THIS IS THE CORRECTED LIST OF FIELDS ---
    # It does NOT include fcm_token or last_notification_sent_at
    fields = (
        'address', 
        'latitude', 
        'longitude', 
        'route', 
        'pickup_order', 
        'formatted_driving_time', # The custom display field
        'is_boarding_today'       # The checkbox
    )
    
    # This makes our custom formatted time read-only
    readonly_fields = ('formatted_driving_time',)

    # This function formats the driving time in seconds
    def formatted_driving_time(self, obj):
        if obj.driving_time_seconds is None:
            return "N/A"
            
        td = timedelta(seconds=obj.driving_time_seconds)
        
        days = td.days
        hours, remainder = divmod(td.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        parts = []
        if days > 0:
            parts.append(f"{days} day{'s' if days > 1 else ''}")
        if hours > 0:
            parts.append(f"{hours} hr{'s' if hours > 1 else ''}")
        if minutes > 0:
            parts.append(f"{minutes} min{'s' if minutes > 1 else ''}")
            
        if not parts:
            if seconds > 0:
                return f"{seconds} sec"
            return "0 min"
            
        return ", ".join(parts)
        
    formatted_driving_time.short_description = 'Driving Time (Calculated)'


# This is the main admin class for the "Student Accounts" tab
class CustomUserAdmin(UserAdmin):
    inlines = (StudentProfileInline, )
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    list_select_related = ('studentprofile', )
    
    # This removes the "Filter" sidebar
    list_filter = () 

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super().get_inline_instances(request, obj)

# Unregister the default User model
admin.site.unregister(User) 
# Register our "StudentAccount" proxy model with the custom admin
admin.site.register(StudentAccount, CustomUserAdmin)

