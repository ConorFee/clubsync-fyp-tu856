from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Facility, Event, Team
from .serializers import FacilitySerializer, EventSerializer, TeamSerializer
from ortools.sat.python import cp_model
import datetime


class FacilityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

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