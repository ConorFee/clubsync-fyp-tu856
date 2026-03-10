from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, date, time

from scheduler.models import Facility, Team, Event, BookingRequest, UserProfile


class AuthenticatedAPITestCase(APITestCase):
    """Base class that creates an admin user and authenticates the test client."""

    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='testadmin', password='testpass123',
            first_name='Test', last_name='Admin',
        )
        UserProfile.objects.create(user=self.admin_user, role='admin')
        self.client.force_authenticate(user=self.admin_user)


class FacilityAPITestCase(AuthenticatedAPITestCase):
    """Tests for the /api/facilities/ endpoint."""

    def setUp(self):
        super().setUp()
        Facility.objects.create(name="Main Pitch", type="pitch")
        Facility.objects.create(name="Hall", type="hall")

    def test_list_facilities(self):
        """GET /api/facilities/ should return 200 with all facilities."""
        response = self.client.get('/api/facilities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class TeamAPITestCase(AuthenticatedAPITestCase):
    """Tests for the /api/teams/ endpoint."""

    def setUp(self):
        super().setUp()
        Team.objects.create(name="U14 Hurling")

    def test_list_teams(self):
        """GET /api/teams/ should return 200 with all teams."""
        response = self.client.get('/api/teams/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class EventAPITestCase(AuthenticatedAPITestCase):
    """Tests for the /api/events/ endpoint."""

    def setUp(self):
        super().setUp()
        self.facility = Facility.objects.create(name="Main Pitch", type="pitch")
        self.now = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)

    def test_list_events(self):
        """GET /api/events/ should return 200."""
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_event(self):
        """POST /api/events/ with valid data should return 201."""
        data = {
            'title': 'Training',
            'start_time': self.now.isoformat(),
            'end_time': (self.now + timedelta(hours=1)).isoformat(),
            'facility': 'Main Pitch',
            'event_type': 'adult_training',
        }
        response = self.client.post('/api/events/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)

    def test_create_event_overlap_rejected(self):
        """Overlapping event on same facility should raise ValidationError via save()."""
        from django.core.exceptions import ValidationError

        Event.objects.create(
            title="Existing",
            start_time=self.now,
            end_time=self.now + timedelta(hours=2),
            facility=self.facility,
        )
        data = {
            'title': 'Overlap',
            'start_time': (self.now + timedelta(hours=1)).isoformat(),
            'end_time': (self.now + timedelta(hours=3)).isoformat(),
            'facility': 'Main Pitch',
        }
        with self.assertRaises(ValidationError):
            self.client.post('/api/events/', data, format='json')


class BookingRequestAPITestCase(AuthenticatedAPITestCase):
    """Tests for the /api/requests/ endpoint."""

    def setUp(self):
        super().setUp()
        self.facility = Facility.objects.create(name="Main Pitch", type="pitch")
        self.team = Team.objects.create(name="U14 Hurling")

    def test_list_requests(self):
        """GET /api/requests/ should return 200."""
        response = self.client.get('/api/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_booking_request(self):
        """POST /api/requests/ with valid data should return 201."""
        data = {
            'team': 'U14 Hurling',
            'title': 'Weekly Training',
            'event_type': 'juvenile_training',
            'duration_minutes': 60,
            'recurrence': 'weekly',
            'preferred_facility': 'Main Pitch',
            'preferred_days': ['tuesday', 'thursday'],
            'preferred_time_start': '18:00',
            'preferred_time_end': '21:00',
            'schedule_from': '2026-03-10',
            'schedule_until': '2026-04-07',
        }
        response = self.client.post('/api/requests/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BookingRequest.objects.count(), 1)


class GenerateScheduleAPITestCase(AuthenticatedAPITestCase):
    """Tests for POST /api/schedule/generate/ endpoint."""

    def setUp(self):
        super().setUp()
        self.facility = Facility.objects.create(
            name="Main Pitch", type="pitch",
            suitable_for=['juvenile_training', 'adult_training', 'match', 'championship'],
        )
        self.team = Team.objects.create(name="U14 Hurling")
        self.date_from = date(2026, 3, 16)
        self.date_until = date(2026, 3, 22)

        BookingRequest.objects.create(
            team=self.team,
            title='U14 Training',
            event_type='juvenile_training',
            duration_minutes=60,
            recurrence='weekly',
            preferred_facility=self.facility,
            preferred_days=['wednesday'],
            preferred_time_start=time(18, 0),
            preferred_time_end=time(21, 0),
            priority=2,
            schedule_from=self.date_from,
            schedule_until=self.date_until,
        )

    def test_generate_schedule(self):
        """POST /api/schedule/generate/ should return success with events created."""
        response = self.client.post('/api/schedule/generate/', {
            'date_from': str(self.date_from),
            'date_until': str(self.date_until),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertGreater(response.data['events_created'], 0)
        self.assertIn('schedule_diff', response.data)

    def test_generate_returns_diff_shape(self):
        """Each schedule_diff entry should have required keys."""
        response = self.client.post('/api/schedule/generate/', {
            'date_from': str(self.date_from),
            'date_until': str(self.date_until),
        }, format='json')
        self.assertTrue(response.data['success'])

        diff = response.data['schedule_diff']
        self.assertGreater(len(diff), 0)

        required_keys = [
            'request_id', 'team_name', 'event_type', 'title',
            'assigned_facility', 'assigned_time', 'facility_changed',
            'time_changed', 'events_count', 'priority', 'weekly_breakdown',
        ]
        for key in required_keys:
            self.assertIn(key, diff[0], f"Missing key: {key}")

    def test_generate_missing_dates(self):
        """POST /api/schedule/generate/ without dates should return 400."""
        response = self.client.post('/api/schedule/generate/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PublishScheduleAPITestCase(AuthenticatedAPITestCase):
    """Tests for POST /api/schedule/publish/ endpoint."""

    def setUp(self):
        super().setUp()
        self.facility = Facility.objects.create(name="Main Pitch", type="pitch")
        self.now = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)

        for i in range(3):
            Event.objects.create(
                title=f"Proposed Event {i}",
                start_time=self.now + timedelta(days=i, hours=i),
                end_time=self.now + timedelta(days=i, hours=i+1),
                facility=self.facility,
                status='proposed',
            )

    def test_publish_schedule(self):
        """Publish should transition proposed events to published."""
        date_from = (self.now - timedelta(days=1)).date()
        date_until = (self.now + timedelta(days=5)).date()

        response = self.client.post('/api/schedule/publish/', {
            'date_from': str(date_from),
            'date_until': str(date_until),
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['events_published'], 3)
        self.assertEqual(Event.objects.filter(status='published').count(), 3)
        self.assertEqual(Event.objects.filter(status='proposed').count(), 0)


class DiscardScheduleAPITestCase(AuthenticatedAPITestCase):
    """Tests for POST /api/schedule/discard/ endpoint."""

    def setUp(self):
        super().setUp()
        self.facility = Facility.objects.create(name="Main Pitch", type="pitch")
        self.team = Team.objects.create(name="U14 Hurling")
        self.now = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
        self.date_from = self.now.date()
        self.date_until = (self.now + timedelta(days=7)).date()

        for i in range(2):
            Event.objects.create(
                title=f"Proposed {i}",
                start_time=self.now + timedelta(days=i, hours=i),
                end_time=self.now + timedelta(days=i, hours=i+1),
                facility=self.facility,
                status='proposed',
            )

        BookingRequest.objects.create(
            team=self.team,
            title='Training',
            event_type='juvenile_training',
            duration_minutes=60,
            recurrence='weekly',
            preferred_days=['tuesday'],
            preferred_time_start=time(18, 0),
            preferred_time_end=time(21, 0),
            priority=2,
            schedule_from=self.date_from,
            schedule_until=self.date_until,
            status='scheduled',
        )

    def test_discard_schedule(self):
        """Discard should delete proposed events and reset requests to pending."""
        response = self.client.post('/api/schedule/discard/', {
            'date_from': str(self.date_from),
            'date_until': str(self.date_until),
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['events_deleted'], 2)
        self.assertEqual(response.data['requests_reset'], 1)
        self.assertEqual(Event.objects.filter(status='proposed').count(), 0)
        self.assertEqual(BookingRequest.objects.filter(status='pending').count(), 1)


class AuthEndpointTestCase(APITestCase):
    """Tests for auth endpoints (login/logout/me)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', password='testpass123',
            first_name='Test', last_name='User',
        )
        UserProfile.objects.create(user=self.user, role='coach')

    def test_login_valid_credentials(self):
        """POST /api/auth/login/ with valid credentials should return 200 + user info."""
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['user']['username'], 'testuser')
        self.assertEqual(response.data['user']['role'], 'coach')

    def test_login_invalid_credentials(self):
        """POST /api/auth/login/ with wrong password should return 401."""
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpassword',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_access_blocked(self):
        """GET /api/events/ without auth should return 403."""
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_create_event(self):
        """POST /api/events/ as viewer should return 403."""
        viewer = User.objects.create_user(username='viewer', password='pass123')
        UserProfile.objects.create(user=viewer, role='viewer')
        self.client.force_authenticate(user=viewer)

        response = self.client.post('/api/events/', {
            'title': 'Test',
            'start_time': timezone.now().isoformat(),
            'end_time': (timezone.now() + timedelta(hours=1)).isoformat(),
            'facility': 'Main Pitch',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_coach_can_create_request(self):
        """POST /api/requests/ as coach should return 201."""
        facility = Facility.objects.create(name="Main Pitch", type="pitch")
        team = Team.objects.create(name="U14 Hurling")
        self.user.profile.team = team
        self.user.profile.save()
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/requests/', {
            'team': 'U14 Hurling',
            'title': 'Training',
            'event_type': 'juvenile_training',
            'duration_minutes': 60,
            'recurrence': 'weekly',
            'preferred_facility': 'Main Pitch',
            'preferred_days': ['tuesday'],
            'preferred_time_start': '18:00',
            'preferred_time_end': '21:00',
            'schedule_from': '2026-03-10',
            'schedule_until': '2026-04-07',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
