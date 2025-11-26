from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FacilityViewSet, EventViewSet

router = DefaultRouter()
router.register('facilities', FacilityViewSet)
router.register('events', EventViewSet)

urlpatterns = router.urls