from rest_framework import serializers
from .models import Facility, Event, Team, BookingRequest


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


class BookingRequestSerializer(serializers.ModelSerializer):
    team = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Team.objects.all(),
    )
    preferred_facility = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Facility.objects.all(),
        required=False,
        allow_null=True,
    )
    # Read-only fields for display
    team_name = serializers.CharField(source='team.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = BookingRequest
        fields = '__all__'
        read_only_fields = ('status', 'scheduled_event', 'rejection_reason', 'created_at', 'updated_at')
