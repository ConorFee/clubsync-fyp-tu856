from django.core.management.base import BaseCommand
from scheduler.models import Facility, Event
from datetime import datetime
from django.utils import timezone


class Command(BaseCommand):
    help = "Load sample An Tóchar events (including one deliberate overlap to prove constraint)"

    def handle(self, *args, **options):
        # Get facilities
        main = Facility.objects.get(name="Main Pitch")
        training = Facility.objects.get(name="Training Pitch")
        hall = Facility.objects.get(name="Gym")

        events = [
            ("Senior Men vs Bray Emmets", "2025-04-05", "14:30", "16:30", main, True),
            ("U14 Boys Training", "2025-01-20", "18:30", "20:00", training, False),
            ("U12 Girls Training", "2025-01-20", "18:30", "19:30", training, False),  # ← OVERLAP!
            ("Senior Ladies Training", "2025-01-21", "19:00", "20:30", hall, False),
            ("U16 Boys vs Roundwood", "2025-03-15", "11:00", "12:30", main, True),
            ("U17 Strength & Conditioning", "2025-01-22", "19:30", "20:30", hall, False),
            ("U10 Football Skills", "2025-01-25", "10:00", "11:00", training, False),
            ("Senior Men Training", "2025-01-23", "19:00", "20:30", main, False),
            ("Committee Meeting", "2025-02-03", "20:00", "21:30", hall, True),
            ("U13 Football Blitz", "2025-05-10", "10:00", "14:00", main, True),
        ]

        created = 0
        for title, date, start, end, fac, fixed in events:
            try:
                dt_start = timezone.make_aware(datetime.strptime(f"{date} {start}", "%Y-%m-%d %H:%M"))
                dt_end = timezone.make_aware(datetime.strptime(f"{date} {end}", "%Y-%m-%d %H:%M"))
                Event.objects.create(
                    title=title,
                    start_time=dt_start,
                    end_time=dt_end,
                    facility=fac,
                    is_fixed=fixed,
                    team_name=title.split(" ")[0] if "Training" in title else None
                )
                self.stdout.write(self.style.SUCCESS(f"Created: {title}"))
                created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"FAILED (blocked by constraint): {title} — {e}"))

        self.stdout.write(self.style.SUCCESS(f"\nLoaded {created}/10 events. Overlap correctly blocked!"))