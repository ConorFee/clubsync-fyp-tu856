from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Facility, Event, Team, BookingRequest
from .serializers import FacilitySerializer, EventSerializer, TeamSerializer, BookingRequestSerializer
from .solver import solve_schedule as run_solver
from ortools.sat.python import cp_model
from datetime import date, datetime


class FacilityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

class BookingRequestViewSet(viewsets.ModelViewSet):
    queryset = BookingRequest.objects.all().order_by('-created_at')
    serializer_class = BookingRequestSerializer

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('start_time')
    serializer_class = EventSerializer

# MVP Solver Endpoint
@api_view(['POST'])
def solve_schedule(request):
    """
    MVP OR-Tools solver:
    - Takes all non-fixed events (Events created by Managers of different teams, no fixed fixtures by the county board)
    - Checks if they can be scheduled without facility overlaps
    - Returns JSON: feasible or not
    """
    model = cp_model.CpModel()
    event_intervals = {}

    # Only check movable (non-fixed) events
    for event in Event.objects.filter(is_fixed=False):
        start_min = int(event.start_time.timestamp() // 60)
        end_min = int(event.end_time.timestamp() // 60)
        duration = end_min - start_min

        interval = model.NewOptionalIntervalVar(
            start_min, duration, end_min, True, f"event_{event.id}"
        )
        event_intervals[event.id] = (interval, event.facility_id)

    # No overlap per facility
    facility_intervals = {}
    for event_id, (interval, fac_id) in event_intervals.items():
        facility_intervals.setdefault(fac_id, []).append(interval)

    for intervals in facility_intervals.values():
        if len(intervals) > 1:
            model.AddNoOverlap(intervals)

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    status = solver.Solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return Response({
            "status": True,
            "message": "Schedule is conflict-free and feasible!",
            "non_fixed_events_checked": len(event_intervals),
            "solver_status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"
        })
    else:
        return Response({
            "status": False,
            "message": "Conflicts detected — schedule not feasible",
            "non_fixed_events_checked": len(event_intervals)
        }, status=400)


@api_view(['POST'])
def generate_schedule(request):
    """
    Run the CP-SAT solver to generate a conflict-free schedule from pending BookingRequests.
    Creates proposed Events and updates BookingRequest statuses.
    """
    date_from_str = request.data.get('date_from')
    date_until_str = request.data.get('date_until')

    if not date_from_str or not date_until_str:
        return Response({'error': 'date_from and date_until are required.'}, status=400)

    try:
        date_from = date.fromisoformat(date_from_str)
        date_until = date.fromisoformat(date_until_str)
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

    if date_from > date_until:
        return Response({'error': 'date_from must be before date_until.'}, status=400)

    # Clean slate: delete existing proposed events in range (allows re-runs)
    Event.objects.filter(
        status='proposed',
        start_time__date__gte=date_from,
        start_time__date__lte=date_until,
    ).delete()

    # Reset any previously scheduled requests back to pending
    BookingRequest.objects.filter(
        status='scheduled',
        schedule_from__lte=date_until,
        schedule_until__gte=date_from,
    ).update(status='pending')

    # Run solver
    result = run_solver(date_from, date_until)

    if not result.success:
        return Response({
            'success': False,
            'solver_status': result.status,
            'solve_time_seconds': round(result.solve_time, 2),
            'message': 'Could not find a valid schedule. Try reducing requests or relaxing constraints.',
        })

    # Bulk create proposed events (bypasses Event.save() overlap check — solver guarantees HC1)
    new_events = [
        Event(
            title=ev['title'],
            start_time=ev['start_time'],
            end_time=ev['end_time'],
            facility_id=ev['facility_id'],
            team_id=ev['team_id'],
            event_type=ev['event_type'],
            status='proposed',
            is_fixed=False,
        )
        for ev in result.events
    ]
    Event.objects.bulk_create(new_events)

    # Update processed BookingRequests to 'scheduled'
    if result.requests_processed:
        BookingRequest.objects.filter(id__in=result.requests_processed).update(status='scheduled')

    return Response({
        'success': True,
        'solver_status': result.status,
        'solve_time_seconds': round(result.solve_time, 2),
        'total_penalty': result.penalty,
        'events_created': len(result.events),
        'requests_processed': len(result.requests_processed),
    })


@api_view(['POST'])
def publish_schedule(request):
    """
    Publish all proposed events in a date range — proposed → published.
    """
    date_from_str = request.data.get('date_from')
    date_until_str = request.data.get('date_until')

    if not date_from_str or not date_until_str:
        return Response({'error': 'date_from and date_until are required.'}, status=400)

    try:
        date_from = date.fromisoformat(date_from_str)
        date_until = date.fromisoformat(date_until_str)
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

    count = Event.objects.filter(
        status='proposed',
        start_time__date__gte=date_from,
        start_time__date__lte=date_until,
    ).update(status='published')

    return Response({
        'success': True,
        'events_published': count,
    })