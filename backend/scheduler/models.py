# scheduler/models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Facility(models.Model):
    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(
        max_length=20,
        choices=[('pitch', 'Pitch'), ('hall', 'Hall'), ('gym', 'Gym')],
    )

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
    
class Event(models.Model):
    title = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='events')
    is_fixed = models.BooleanField(default=False, help_text="County fixtures – cannot be moved")
    team_name = models.CharField(max_length=100, blank=True, null=True)
    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")

    def save(self, *args, **kwargs):
        # Hard constraint: no overlap on same facility
        overlapping = Event.objects.filter(
            facility=self.facility,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError("This facility is already booked at that time.")

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} – {self.facility}"

    class Meta:
        ordering = ['start_time']