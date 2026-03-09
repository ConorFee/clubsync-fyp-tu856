from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta

from scheduler.models import Facility, Team, Event, EVENT_TYPE_PRIORITIES


class EventCleanTestCase(TestCase):
    """Tests for Event.clean() validation (end_time must be after start_time)."""

    def setUp(self):
        self.facility = Facility.objects.create(name="Main Pitch", type="pitch")
        self.now = timezone.now()

    def test_event_clean_end_before_start(self):
        """clean() should reject events where end_time <= start_time."""
        event = Event(
            title="Invalid Event",
            start_time=self.now,
            end_time=self.now - timedelta(hours=1),
            facility=self.facility,
        )
        with self.assertRaises(ValidationError):
            event.clean()

    def test_event_clean_end_equals_start(self):
        """clean() should reject events where end_time == start_time."""
        event = Event(
            title="Zero Duration",
            start_time=self.now,
            end_time=self.now,
            facility=self.facility,
        )
        with self.assertRaises(ValidationError):
            event.clean()

    def test_event_clean_valid(self):
        """clean() should pass when end_time > start_time."""
        event = Event(
            title="Valid Event",
            start_time=self.now,
            end_time=self.now + timedelta(hours=1),
            facility=self.facility,
        )
        event.clean()  # Should not raise


class EventOverlapTestCase(TestCase):
    """Tests for Event.save() overlap prevention (HC1 at DB level)."""

    def setUp(self):
        self.facility = Facility.objects.create(name="Main Pitch", type="pitch")
        self.facility2 = Facility.objects.create(name="Training Pitch", type="pitch")
        self.now = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)

        # Existing event: 10:00 - 12:00 on Main Pitch
        self.existing = Event.objects.create(
            title="Existing Match",
            start_time=self.now,
            end_time=self.now + timedelta(hours=2),
            facility=self.facility,
            status="published",
        )

    def test_event_save_overlap_rejected(self):
        """Overlapping event on the same facility should raise ValidationError."""
        overlapping = Event(
            title="Overlap Event",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=3),
            facility=self.facility,
        )
        with self.assertRaises(ValidationError):
            overlapping.save()

    def test_event_save_no_overlap_different_facility(self):
        """Same time on a different facility should save successfully."""
        event = Event(
            title="Different Pitch",
            start_time=self.now,
            end_time=self.now + timedelta(hours=2),
            facility=self.facility2,
        )
        event.save()
        self.assertTrue(Event.objects.filter(pk=event.pk).exists())

    def test_event_save_cancelled_ignored(self):
        """A cancelled event should not block creation of an overlapping event."""
        self.existing.status = "cancelled"
        self.existing.save()

        event = Event(
            title="Replacement Event",
            start_time=self.now,
            end_time=self.now + timedelta(hours=2),
            facility=self.facility,
        )
        event.save()
        self.assertTrue(Event.objects.filter(pk=event.pk).exists())

    def test_event_save_adjacent_allowed(self):
        """Back-to-back events (end of first == start of second) should not conflict."""
        adjacent = Event(
            title="After Match",
            start_time=self.now + timedelta(hours=2),  # starts exactly when existing ends
            end_time=self.now + timedelta(hours=3),
            facility=self.facility,
        )
        adjacent.save()
        self.assertTrue(Event.objects.filter(pk=adjacent.pk).exists())


class FacilityTestCase(TestCase):
    """Tests for Facility model constraints."""

    def test_facility_unique_name(self):
        """Creating two facilities with the same name should raise IntegrityError."""
        Facility.objects.create(name="Main Pitch", type="pitch")
        with self.assertRaises(IntegrityError):
            Facility.objects.create(name="Main Pitch", type="hall")


class EventTypePrioritiesTestCase(TestCase):
    """Tests for EVENT_TYPE_PRIORITIES mapping."""

    def test_booking_request_priority_mapping(self):
        """EVENT_TYPE_PRIORITIES should map event types to correct priority values."""
        self.assertEqual(EVENT_TYPE_PRIORITIES['championship'], 3)
        self.assertEqual(EVENT_TYPE_PRIORITIES['match'], 3)
        self.assertEqual(EVENT_TYPE_PRIORITIES['adult_training'], 2)
        self.assertEqual(EVENT_TYPE_PRIORITIES['juvenile_training'], 2)
        self.assertEqual(EVENT_TYPE_PRIORITIES['gym_session'], 1)
        self.assertEqual(EVENT_TYPE_PRIORITIES['meeting'], 1)
        self.assertEqual(EVENT_TYPE_PRIORITIES['other'], 1)
