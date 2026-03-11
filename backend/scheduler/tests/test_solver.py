from django.test import TestCase
from django.utils import timezone
from datetime import date, time, timedelta, datetime

from scheduler.models import Facility, Team, Event, BookingRequest
from scheduler.solver import solve_schedule


class SolverBasicTestCase(TestCase):
    """Basic solver tests — optimal, infeasible, empty, and edge cases."""

    def setUp(self):
        self.facility = Facility.objects.create(
            name="Main Pitch", type="pitch",
            suitable_for=['juvenile_training', 'adult_training', 'match', 'championship'],
        )
        self.facility2 = Facility.objects.create(
            name="Training Pitch", type="pitch",
            suitable_for=['juvenile_training', 'adult_training', 'match'],
        )
        self.team = Team.objects.create(
            name="U14 Hurling", age_group="U14",
            usual_day="wednesday", usual_time=time(18, 0),
            usual_facility=self.facility,
        )
        self.team2 = Team.objects.create(
            name="Senior Men", age_group="Senior",
            usual_day="tuesday", usual_time=time(19, 0),
            usual_facility=self.facility,
        )
        self.date_from = date(2026, 3, 16)  # Monday
        self.date_until = date(2026, 3, 22)  # Sunday

    def _create_request(self, team, title, event_type, duration, days, time_start, time_end, facility=None):
        """Helper to create a pending BookingRequest."""
        return BookingRequest.objects.create(
            team=team,
            title=title,
            event_type=event_type,
            duration_minutes=duration,
            recurrence='weekly',
            preferred_facility=facility,
            preferred_days=days,
            preferred_time_start=time_start,
            preferred_time_end=time_end,
            priority=2,
            schedule_from=self.date_from,
            schedule_until=self.date_until,
        )

    def test_solver_optimal_basic(self):
        """Simple input (1 request, plenty of capacity) should return OPTIMAL."""
        self._create_request(
            self.team, "U14 Training", "juvenile_training", 60,
            ['wednesday'], time(18, 0), time(21, 0), self.facility,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        self.assertEqual(result.status, 'OPTIMAL')
        self.assertGreater(len(result.events), 0)

    def test_solver_empty_requests(self):
        """No pending requests should return success with 0 events."""
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        self.assertEqual(result.status, 'OPTIMAL')
        self.assertEqual(len(result.events), 0)
        self.assertEqual(result.penalty, 0)

    def test_solver_no_facilities(self):
        """No facilities in the database should return INFEASIBLE."""
        Facility.objects.all().delete()

        self._create_request(
            self.team, "Training", "juvenile_training", 60,
            ['wednesday'], time(18, 0), time(21, 0),
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertFalse(result.success)
        self.assertEqual(result.status, 'INFEASIBLE')


class SolverHardConstraintTestCase(TestCase):
    """Tests verifying hard constraint enforcement (HC1-HC7)."""

    def setUp(self):
        self.facility = Facility.objects.create(
            name="Main Pitch", type="pitch",
            suitable_for=['juvenile_training', 'adult_training', 'match', 'championship'],
        )
        self.facility2 = Facility.objects.create(
            name="Training Pitch", type="pitch",
            suitable_for=['juvenile_training', 'adult_training'],
        )
        self.gym = Facility.objects.create(
            name="Gym", type="gym",
            suitable_for=['gym_session'],
        )
        self.team = Team.objects.create(
            name="U14 Hurling", age_group="U14",
            usual_facility=self.facility,
        )
        self.team2 = Team.objects.create(
            name="Senior Men", age_group="Senior",
            usual_facility=self.facility,
        )
        self.date_from = date(2026, 3, 16)
        self.date_until = date(2026, 3, 22)

    def _create_request(self, team, title, event_type, duration, days, time_start, time_end, facility=None):
        return BookingRequest.objects.create(
            team=team, title=title, event_type=event_type,
            duration_minutes=duration, recurrence='weekly',
            preferred_facility=facility, preferred_days=days,
            preferred_time_start=time_start, preferred_time_end=time_end,
            priority=2, schedule_from=self.date_from, schedule_until=self.date_until,
        )

    def test_solver_no_facility_overlap(self):
        """HC1: No two events should share the same facility at the same time."""
        # Two teams request the same day, same time, same facility
        self._create_request(
            self.team, "U14 Training", "juvenile_training", 60,
            ['wednesday'], time(18, 0), time(21, 0), self.facility,
        )
        self._create_request(
            self.team2, "Senior Training", "adult_training", 90,
            ['wednesday'], time(18, 0), time(21, 0), self.facility,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        # Check no two events overlap on the same facility
        for i, ev1 in enumerate(result.events):
            for ev2 in result.events[i+1:]:
                if ev1['facility_id'] == ev2['facility_id']:
                    self.assertFalse(
                        ev1['start_time'] < ev2['end_time'] and ev2['start_time'] < ev1['end_time'],
                        f"HC1 violated: overlap on facility {ev1['facility_id']}"
                    )

    def test_solver_fixed_events_immovable(self):
        """HC2: Pre-existing fixed/published events should not be moved."""
        # Create a fixed event on Wednesday 18:00-20:00
        fixed_start = timezone.make_aware(datetime(2026, 3, 18, 18, 0))
        fixed_end = timezone.make_aware(datetime(2026, 3, 18, 20, 0))
        Event.objects.create(
            title="County Match (Fixed)",
            start_time=fixed_start, end_time=fixed_end,
            facility=self.facility, is_fixed=True, status='published',
        )

        # Request training at the same time on the same facility
        self._create_request(
            self.team, "U14 Training", "juvenile_training", 60,
            ['wednesday'], time(18, 0), time(21, 0), self.facility,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        # Verify no solver event overlaps with the fixed event on Main Pitch
        for ev in result.events:
            if ev['facility_id'] == self.facility.id:
                self.assertFalse(
                    ev['start_time'] < fixed_end.replace(tzinfo=None) and
                    fixed_start.replace(tzinfo=None) < ev['end_time'],
                    "HC2 violated: solver event overlaps with fixed event"
                )

    def test_solver_duration_match(self):
        """HC6: Every event's duration should match the request's duration_minutes."""
        self._create_request(
            self.team, "U14 Training", "juvenile_training", 60,
            ['wednesday'], time(18, 0), time(21, 0), self.facility,
        )
        self._create_request(
            self.team2, "Senior Training", "adult_training", 90,
            ['tuesday'], time(18, 0), time(21, 0), self.facility,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        for ev in result.events:
            actual_duration = (ev['end_time'] - ev['start_time']).total_seconds() / 60
            # Find the matching request to check expected duration
            req = BookingRequest.objects.get(id=ev['request_id'])
            self.assertEqual(
                actual_duration, req.duration_minutes,
                f"HC6 violated: event duration {actual_duration} != request {req.duration_minutes}"
            )

    def test_solver_facility_compatibility(self):
        """HC7: Events should only be placed at facilities whose suitable_for includes the event type."""
        # Gym session — only the Gym facility can host this
        self._create_request(
            self.team, "Gym Session", "gym_session", 60,
            ['wednesday'], time(18, 0), time(21, 0),
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        for ev in result.events:
            if ev['event_type'] == 'gym_session':
                self.assertEqual(
                    ev['facility_id'], self.gym.id,
                    f"HC7 violated: gym_session placed at facility {ev['facility_id']}, expected Gym ({self.gym.id})"
                )

    def test_solver_warmup_buffer_match(self):
        """HC4: A 15-minute gap should exist before match/championship events at the same facility."""
        # Create a training that ends at 19:00 (via fixed event)
        training_start = timezone.make_aware(datetime(2026, 3, 18, 18, 0))
        training_end = timezone.make_aware(datetime(2026, 3, 18, 19, 0))
        Event.objects.create(
            title="Earlier Training",
            start_time=training_start, end_time=training_end,
            facility=self.facility, event_type='adult_training',
            is_fixed=True, status='published',
        )

        # Request a match on the same day/facility — solver must leave 15-min gap
        self._create_request(
            self.team2, "Senior Match", "match", 120,
            ['wednesday'], time(19, 0), time(21, 30), self.facility,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        for ev in result.events:
            if ev['event_type'] == 'match' and ev['facility_id'] == self.facility.id:
                # Match should start at 19:15 or later (19:00 + 15-min buffer)
                gap_minutes = (ev['start_time'] - training_end.replace(tzinfo=None)).total_seconds() / 60
                self.assertGreaterEqual(
                    gap_minutes, 15,
                    f"HC4 violated: only {gap_minutes} min gap before match (need 15)"
                )

    def test_solver_no_warmup_training(self):
        """HC4: Training events should be allowed back-to-back (no warmup buffer)."""
        # Fixed training 18:00-19:00
        training_start = timezone.make_aware(datetime(2026, 3, 18, 18, 0))
        training_end = timezone.make_aware(datetime(2026, 3, 18, 19, 0))
        Event.objects.create(
            title="First Training",
            start_time=training_start, end_time=training_end,
            facility=self.facility, event_type='juvenile_training',
            is_fixed=True, status='published',
        )

        # Request another training immediately after — should be allowed at 19:00
        self._create_request(
            self.team2, "Senior Training", "adult_training", 90,
            ['wednesday'], time(19, 0), time(21, 0), self.facility,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        for ev in result.events:
            if ev['event_type'] == 'adult_training' and ev['facility_id'] == self.facility.id:
                gap_minutes = (ev['start_time'] - training_end.replace(tzinfo=None)).total_seconds() / 60
                self.assertGreaterEqual(gap_minutes, 0, "Event should not start before training ends")
                # Training can start immediately (0-min gap is fine)
                self.assertLessEqual(
                    gap_minutes, 15,
                    f"Training should be allowed back-to-back but got {gap_minutes} min gap"
                )


class SolverSoftConstraintTestCase(TestCase):
    """Tests verifying soft constraint behaviour (SC1, SC3)."""

    def setUp(self):
        self.facility = Facility.objects.create(
            name="Main Pitch", type="pitch",
            suitable_for=['juvenile_training', 'adult_training', 'match'],
        )
        self.facility2 = Facility.objects.create(
            name="Training Pitch", type="pitch",
            suitable_for=['juvenile_training', 'adult_training'],
        )
        self.team = Team.objects.create(
            name="U14 Hurling", age_group="U14",
            usual_facility=self.facility,
        )
        self.date_from = date(2026, 3, 16)
        self.date_until = date(2026, 3, 22)

    def test_solver_preferred_facility(self):
        """SC1: When preferred facility has capacity, solver should assign it (penalty=0)."""
        BookingRequest.objects.create(
            team=self.team, title="U14 Training", event_type='juvenile_training',
            duration_minutes=60, recurrence='weekly',
            preferred_facility=self.facility,
            preferred_days=['wednesday'],
            preferred_time_start=time(18, 0), preferred_time_end=time(21, 0),
            priority=2,
            schedule_from=self.date_from, schedule_until=self.date_until,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        self.assertEqual(result.penalty, 0)
        for ev in result.events:
            self.assertEqual(ev['facility_id'], self.facility.id)

    def test_solver_preferred_time_window(self):
        """SC3: Events should be placed within the preferred time window when possible."""
        BookingRequest.objects.create(
            team=self.team, title="U14 Training", event_type='juvenile_training',
            duration_minutes=60, recurrence='weekly',
            preferred_facility=self.facility,
            preferred_days=['wednesday'],
            preferred_time_start=time(18, 0), preferred_time_end=time(19, 30),
            priority=2,
            schedule_from=self.date_from, schedule_until=self.date_until,
        )
        result = solve_schedule(self.date_from, self.date_until)

        self.assertTrue(result.success)
        for ev in result.events:
            start_hour = ev['start_time'].hour
            start_min = ev['start_time'].minute
            start_total = start_hour * 60 + start_min
            # Should be within 18:00-19:30 window
            self.assertGreaterEqual(start_total, 18 * 60)
            self.assertLessEqual(start_total + 60, 19 * 60 + 30)
