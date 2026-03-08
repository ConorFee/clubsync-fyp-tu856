from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FacilityViewSet, EventViewSet, TeamViewSet, BookingRequestViewSet,
    generate_schedule, publish_schedule, discard_schedule,
)

router = DefaultRouter()
router.register('facilities', FacilityViewSet)
router.register('events', EventViewSet)
router.register('teams', TeamViewSet)
router.register('requests', BookingRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('schedule/generate/', generate_schedule, name='generate-schedule'),
    path('schedule/publish/', publish_schedule, name='publish-schedule'),
    path('schedule/discard/', discard_schedule, name='discard-schedule'),
]