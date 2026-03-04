from rest_framework import serializers
from .models import Facility, Event, Team, BookingRequest, EVENT_TYPE_PRIORITIES


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

    def validate(self, data):
        recurrence = data.get('recurrence', self.instance.recurrence if self.instance else 'weekly')

        if recurrence == 'once':
            if not data.get('target_date'):
                raise serializers.ValidationError(
                    {'target_date': 'Target date is required for one-time events.'}
                )
            # Auto-derive preferred_days from target_date weekday
            day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            data['preferred_days'] = [day_names[data['target_date'].weekday()]]
            # Auto-set schedule range to the target date
            data['schedule_from'] = data['target_date']
            data['schedule_until'] = data['target_date']
        else:
            if not data.get('preferred_days'):
                raise serializers.ValidationError(
                    {'preferred_days': 'At least one training day is required for weekly events.'}
                )
            data['target_date'] = None

        # Validate time window is large enough for requested duration
        time_start = data.get('preferred_time_start')
        time_end = data.get('preferred_time_end')
        duration = data.get('duration_minutes')
        if time_start and time_end and duration:
            start_mins = time_start.hour * 60 + time_start.minute
            end_mins = time_end.hour * 60 + time_end.minute
            if (end_mins - start_mins) < duration:
                raise serializers.ValidationError(
                    {'preferred_time_end': f'Time window ({end_mins - start_mins} min) is shorter than the requested duration ({duration} min).'}
                )

        # Auto-derive priority from event_type (SC5)
        event_type = data.get('event_type', self.instance.event_type if self.instance else 'other')
        data['priority'] = EVENT_TYPE_PRIORITIES.get(event_type, 1)

        return data
