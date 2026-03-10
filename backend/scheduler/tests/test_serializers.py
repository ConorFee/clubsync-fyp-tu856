from django.test import TestCase
from datetime import date, time

from scheduler.models import Facility, Team
from scheduler.serializers import BookingRequestSerializer


class BookingRequestSerializerTestCase(TestCase):
    """Tests for BookingRequestSerializer validation rules."""

    def setUp(self):
        self.facility = Facility.objects.create(name="Main Pitch", type="pitch")
        self.team = Team.objects.create(name="U14 Hurling")

        # Base valid data for a weekly request — tests override specific fields
        self.valid_weekly_data = {
            'team': 'U14 Hurling',
            'title': 'Weekly Training',
            'event_type': 'juvenile_training',
            'duration_minutes': 60,
            'recurrence': 'weekly',
            'preferred_facility': 'Main Pitch',
            'preferred_days': ['tuesday', 'thursday'],
            'preferred_time_start': '18:00',
            'preferred_time_end': '21:00',
            'schedule_from': '2026-03-09',
            'schedule_until': '2026-04-06',
        }

    def test_valid_weekly_request(self):
        """A well-formed weekly request should pass validation."""
        serializer = BookingRequestSerializer(data=self.valid_weekly_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_time_window_shorter_than_duration(self):
        """Should reject when preferred time window is shorter than duration_minutes."""
        data = {**self.valid_weekly_data,
            'preferred_time_start': '18:00',
            'preferred_time_end': '18:30',
            'duration_minutes': 60,
        }
        serializer = BookingRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('preferred_time_end', serializer.errors)

    def test_weekly_missing_preferred_days(self):
        """Weekly recurrence without preferred_days should be rejected."""
        data = {**self.valid_weekly_data, 'preferred_days': []}
        serializer = BookingRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('preferred_days', serializer.errors)

    def test_once_missing_target_date(self):
        """One-time event without target_date should be rejected."""
        data = {**self.valid_weekly_data,
            'recurrence': 'once',
            'target_date': None,
        }
        serializer = BookingRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('target_date', serializer.errors)

    def test_priority_auto_derived_from_event_type(self):
        """Priority should be auto-set based on event_type (match=3, training=2, meeting=1)."""
        # Match → priority 3
        data = {**self.valid_weekly_data, 'event_type': 'match', 'duration_minutes': 120}
        serializer = BookingRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['priority'], 3)

        # Juvenile training → priority 2
        data = {**self.valid_weekly_data, 'event_type': 'juvenile_training'}
        serializer = BookingRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['priority'], 2)

        # Meeting → priority 1
        data = {**self.valid_weekly_data, 'event_type': 'meeting'}
        serializer = BookingRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['priority'], 1)
