from rest_framework import serializers
from .models import Facility, Event, Team


class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = '__all__'


class TeamSerializer(serializers.ModelSerializer):
    usual_facility = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Facility.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Team
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):
    facility = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Facility.objects.all(),
    )
    team = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Team.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Event
        fields = '__all__'
