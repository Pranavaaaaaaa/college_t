# transport/models.py
from django.db import models

class Route(models.Model):
    """
    A single bus route, e.g., "Route A", "Route B".
    This is just a label for a group of students.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name