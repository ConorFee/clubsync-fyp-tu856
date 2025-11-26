from rest_framework import serializers
from .models import Facility, Event

class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = '__all__'

class EventSerializer(serializers.ModelSerializer):
    facility = serializers.SlugRelatedField(slug_field='name', queryset=Facility.objects.all())

    class Meta:
        model = Event
        fields = '__all__'

        