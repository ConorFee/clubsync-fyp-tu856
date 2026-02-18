# scheduler/admin.py
from django.contrib import admin
from .models import Facility, Event, Team


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'type')
    search_fields = ('name',)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'age_group', 'usual_day', 'usual_time', 'usual_facility', 'is_flexible')
    list_filter = ('age_group', 'is_flexible')
    search_fields = ('name',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'facility', 'start_time', 'end_time', 'event_type', 'status', 'is_fixed', 'team_name')
    list_filter = ('facility', 'is_fixed', 'event_type', 'status')
    search_fields = ('title', 'team_name')
