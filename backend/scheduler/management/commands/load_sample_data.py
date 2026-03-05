"""
Management command to populate the database with demo-ready sample data.

Usage: python manage.py load_sample_data

Creates:
- 4 Facilities (Main Pitch, Training Pitch, Hall, Gym)
- 8 Teams with age_groups, usual_day/time, is_flexible flags
- 3 Fixed events (county fixtures)
- 9 BookingRequests with varied preferences, priorities, days (includes 1 one-time event)
"""

from datetime import date, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from scheduler.models import Facility, Team, Event, BookingRequest


class Command(BaseCommand):
    help = 'Load sample data for ClubSync demo'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        BookingRequest.objects.all().delete()
        Event.objects.all().delete()
        Team.objects.all().delete()
        Facility.objects.all().delete()

        # ── Facilities ──
        self.stdout.write('Creating facilities...')
        main_pitch = Facility.objects.create(
            name='Main Pitch', type='pitch',
            suitable_for=['match', 'championship', 'adult_training', 'juvenile_training'],
        )
        training_pitch = Facility.objects.create(
            name='Training Pitch', type='pitch',
            suitable_for=['adult_training', 'juvenile_training'],
        )
        hall = Facility.objects.create(
            name='Hall', type='hall',
            suitable_for=['meeting'],
        )
        gym = Facility.objects.create(
            name='Gym', type='gym',
            suitable_for=['gym_session'],
        )

        # ── Teams ──
        self.stdout.write('Creating teams...')
        u10_boys = Team.objects.create(
            name='U10 Boys', age_group='U10',
            usual_day='tuesday', usual_time=time(18, 0),
            usual_facility=training_pitch, is_flexible=True,
        )
        u12_boys = Team.objects.create(
            name='U12 Boys', age_group='U12',
            usual_day='wednesday', usual_time=time(18, 0),
            usual_facility=training_pitch, is_flexible=True,
        )
        u14_boys = Team.objects.create(
            name='U14 Boys', age_group='U14',
            usual_day='thursday', usual_time=time(18, 30),
            usual_facility=main_pitch, is_flexible=False,
        )
        minor_boys = Team.objects.create(
            name='Minor Boys', age_group='U17',
            usual_day='tuesday', usual_time=time(19, 30),
            usual_facility=main_pitch, is_flexible=True,
        )
        senior_men = Team.objects.create(
            name='Senior Men', age_group='Senior',
            usual_day='tuesday', usual_time=time(20, 0),
            usual_facility=main_pitch, is_flexible=False,
        )
        u14_girls = Team.objects.create(
            name='U14 Girls', age_group='U14',
            usual_day='wednesday', usual_time=time(18, 30),
            usual_facility=main_pitch, is_flexible=True,
        )
        senior_ladies = Team.objects.create(
            name='Senior Ladies', age_group='Senior',
            usual_day='thursday', usual_time=time(20, 0),
            usual_facility=main_pitch, is_flexible=True,
        )
        hurlers = Team.objects.create(
            name='Senior Hurlers', age_group='Senior',
            usual_day='wednesday', usual_time=time(20, 0),
            usual_facility=main_pitch, is_flexible=False,
        )

        # ── Fixed Events (County Fixtures — immovable) ──
        self.stdout.write('Creating fixed events...')
        Event.objects.create(
            title='County U14 Football Championship',
            start_time=timezone.make_aware(timezone.datetime(2026, 3, 8, 11, 0)),
            end_time=timezone.make_aware(timezone.datetime(2026, 3, 8, 13, 30)),
            facility=main_pitch, is_fixed=True,
            event_type='championship', status='published',
            team=u14_boys, team_name='U14 Boys',
        )
        Event.objects.create(
            title='County Senior Football League',
            start_time=timezone.make_aware(timezone.datetime(2026, 3, 15, 14, 0)),
            end_time=timezone.make_aware(timezone.datetime(2026, 3, 15, 16, 30)),
            facility=main_pitch, is_fixed=True,
            event_type='match', status='published',
            team=senior_men, team_name='Senior Men',
        )
        Event.objects.create(
            title='County Hurling League',
            start_time=timezone.make_aware(timezone.datetime(2026, 3, 22, 14, 0)),
            end_time=timezone.make_aware(timezone.datetime(2026, 3, 22, 16, 30)),
            facility=main_pitch, is_fixed=True,
            event_type='match', status='published',
            team=hurlers, team_name='Senior Hurlers',
        )

        # ── Booking Requests (Pending — ready for solver) ──
        self.stdout.write('Creating booking requests...')

        # Schedule period: March 2026
        march_from = date(2026, 3, 1)
        march_until = date(2026, 3, 31)

        BookingRequest.objects.create(
            team=u10_boys, title='U10 Boys Weekly Training',
            event_type='juvenile_training', duration_minutes=60,
            recurrence='weekly',
            preferred_facility=training_pitch,
            preferred_days=['tuesday'],
            preferred_time_start=time(17, 30), preferred_time_end=time(19, 0),
            priority=2,
            schedule_from=march_from, schedule_until=march_until,
        )

        BookingRequest.objects.create(
            team=u12_boys, title='U12 Boys Weekly Training',
            event_type='juvenile_training', duration_minutes=60,
            recurrence='weekly',
            preferred_facility=training_pitch,
            preferred_days=['wednesday'],
            preferred_time_start=time(17, 30), preferred_time_end=time(19, 0),
            priority=2,
            schedule_from=march_from, schedule_until=march_until,
        )

        BookingRequest.objects.create(
            team=u14_boys, title='U14 Boys Weekly Training',
            event_type='juvenile_training', duration_minutes=60,
            recurrence='weekly',
            preferred_facility=main_pitch,
            preferred_days=['thursday'],
            preferred_time_start=time(18, 0), preferred_time_end=time(20, 0),
            priority=3,
            schedule_from=march_from, schedule_until=march_until,
        )

        BookingRequest.objects.create(
            team=minor_boys, title='Minor Boys Training',
            event_type='adult_training', duration_minutes=90,
            recurrence='weekly',
            preferred_facility=main_pitch,
            preferred_days=['tuesday', 'wednesday'],
            preferred_time_start=time(19, 0), preferred_time_end=time(21, 30),
            priority=2,
            schedule_from=march_from, schedule_until=march_until,
        )

        BookingRequest.objects.create(
            team=senior_men, title='Senior Men Training',
            event_type='adult_training', duration_minutes=90,
            recurrence='weekly',
            preferred_facility=main_pitch,
            preferred_days=['tuesday', 'thursday'],
            preferred_time_start=time(19, 30), preferred_time_end=time(22, 0),
            priority=3,
            schedule_from=march_from, schedule_until=march_until,
        )

        BookingRequest.objects.create(
            team=u14_girls, title='U14 Girls Weekly Training',
            event_type='juvenile_training', duration_minutes=60,
            recurrence='weekly',
            preferred_facility=main_pitch,
            preferred_days=['wednesday'],
            preferred_time_start=time(18, 0), preferred_time_end=time(20, 0),
            priority=2,
            schedule_from=march_from, schedule_until=march_until,
        )

        BookingRequest.objects.create(
            team=senior_ladies, title='Senior Ladies Training',
            event_type='adult_training', duration_minutes=90,
            recurrence='weekly',
            preferred_facility=main_pitch,
            preferred_days=['thursday'],
            preferred_time_start=time(19, 30), preferred_time_end=time(22, 0),
            priority=2,
            schedule_from=march_from, schedule_until=march_until,
        )

        BookingRequest.objects.create(
            team=hurlers, title='Senior Hurlers Gym Session',
            event_type='gym_session', duration_minutes=60,
            recurrence='weekly',
            preferred_facility=gym,
            preferred_days=['monday', 'wednesday'],
            preferred_time_start=time(19, 0), preferred_time_end=time(21, 0),
            priority=1,
            schedule_from=march_from, schedule_until=march_until,
        )

        # One-time event using target_date
        BookingRequest.objects.create(
            team=senior_men, title='Senior Men Pre-Match Meeting',
            event_type='meeting', duration_minutes=60,
            recurrence='once',
            preferred_facility=hall,
            preferred_days=['saturday'],
            target_date=date(2026, 3, 14),
            preferred_time_start=time(10, 0), preferred_time_end=time(12, 0),
            priority=3,
            schedule_from=date(2026, 3, 14), schedule_until=date(2026, 3, 14),
        )

        self.stdout.write(self.style.SUCCESS(
            'Sample data loaded: 4 facilities, 8 teams, 3 fixed events, 9 booking requests'
        ))
