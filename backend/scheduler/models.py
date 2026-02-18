# scheduler/models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


# --- Event Type Definitions ---

EVENT_TYPE_CHOICES = [
    ('juvenile_training', 'Juvenile Training'),   # 60 min
    ('adult_training', 'Adult Training'),          # 90 min
    ('gym_session', 'Gym Session'),                # 60 min
    ('match', 'Match'),                            # 120 min
    ('championship', 'Championship Match'),        # 150 min
    ('meeting', 'Meeting'),                        # 60 min
    ('other', 'Other'),                            # no default
]

EVENT_TYPE_DURATIONS = {
    'juvenile_training': 60,
    'adult_training': 90,
    'gym_session': 60,
    'match': 120,
    'championship': 150,
    'meeting': 60,
    'other': None,
}


# --- Models ---

class Facility(models.Model):
    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(
        max_length=20,
        choices=[('pitch', 'Pitch'), ('hall', 'Hall'), ('gym', 'Gym')],
    )
    class Meta:
        verbose_name_plural = 'facilities'

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    age_group = models.CharField(max_length=50, blank=True)
    usual_day = models.CharField(max_length=20, blank=True)
    usual_time = models.TimeField(null=True, blank=True)
    usual_facility = models.ForeignKey(
        Facility,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usual_teams',
    )
    is_flexible = models.BooleanField(
        default=True,
        help_text="Flexible teams can be moved more easily by the solver",
    )

    def __str__(self):
        return self.name


class Event(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('proposed', 'Proposed'),
        ('published', 'Published'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='events')
    is_fixed = models.BooleanField(default=False, help_text="County fixtures – cannot be moved")
    team_name = models.CharField(max_length=100, blank=True, null=True)

    # New fields
    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPE_CHOICES,
        default='other',
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
    )

    def clean(self):
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")

    def save(self, *args, **kwargs):
        # Hard constraint: no overlap on same facility
        overlapping = Event.objects.filter(
            facility=self.facility,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk).exclude(status='cancelled')

        if overlapping.exists():
            raise ValidationError("This facility is already booked at that time.")

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} – {self.facility}"

    class Meta:
        ordering = ['start_time']
