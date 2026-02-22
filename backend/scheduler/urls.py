from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FacilityViewSet, EventViewSet, TeamViewSet, BookingRequestViewSet, solve_schedule

router = DefaultRouter()
router.register('facilities', FacilityViewSet)
router.register('events', EventViewSet)
router.register('teams', TeamViewSet)
router.register('requests', BookingRequestViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('schedule/solve/', solve_schedule, name='solve-schedule'),
]