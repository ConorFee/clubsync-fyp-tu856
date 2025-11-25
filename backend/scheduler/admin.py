# scheduler/admin.py
from django.contrib import admin
from .models import Facility, Event


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'type')
    search_fields = ('name',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'facility', 'start_time', 'end_time', 'is_fixed', 'team_name')
    list_filter = ('facility', 'is_fixed')
    search_fields = ('title', 'team_name')
    readonly_fields = ('created_at',) if hasattr(Event, 'created_at') else ()