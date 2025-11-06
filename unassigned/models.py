# unassigned/models.py
from students.models import StudentProfile

class UnassignedStudent(StudentProfile):
    """
    This is a Proxy Model. It doesn't create a new database table.
    It just gives us a way to manage a *filtered* version of the
    StudentProfile model within the admin.
    """
    class Meta:
        proxy = True
        verbose_name = 'Unassigned Student'
        verbose_name_plural = 'Unassigned Students'