# scheduler/solver.py — OR-Tools CP-SAT Constraint Programming Solver
#
# Pure function: reads from DB, returns SolverResult. Does NOT write to DB.
# The caller (views.py) handles Event creation and BookingRequest status updates.

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, time
from ortools.sat.python import cp_model

from .models import Facility, Team, Event, BookingRequest

# ── Constants ──
WARMUP_BUFFER = 15         # minutes before match/championship for team warmup on pitch
SOLVER_TIMEOUT = 30        # seconds
MATCH_TYPES = {'match', 'championship'}  # event types that require a warmup buffer

PENALTY_WEIGHTS = {
    'preferred_facility': 100,
    'preferred_time': 60,
    'usual_time_strict': 200,
    'usual_time_flexible': 50,
    'younger_earlier': 30,
}

JUVENILE_AGE_GROUPS = {'U10', 'U12', 'U14'}
EVENING_CUTOFF_HOUR = 19   # 7 PM — SC6 younger-earlier threshold

DAY_NAME_TO_WEEKDAY = {
    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
    'friday': 4, 'saturday': 5, 'sunday': 6,
}


# ── Data Classes ──
@dataclass
class SlotInstance:
    """One schedulable occurrence generated from a BookingRequest."""
    request: BookingRequest
    target_date: date
    duration: int               # minutes
    day_start_offset: int       # linearised minutes from epoch to midnight of target_date
    time_start_min: int         # earliest start (minutes from midnight)
    time_end_min: int           # latest end (minutes from midnight)
    # Solver variables — assigned during model building
    start_var: object = None
    facility_var: object = None
    interval_var: object = None
    facility_bools: dict = field(default_factory=dict)       # {fac_idx: BoolVar}
    facility_intervals: dict = field(default_factory=dict)   # {fac_idx: IntervalVar}


@dataclass
class SolverResult:
    success: bool               # True if OPTIMAL or FEASIBLE
    status: str                 # 'OPTIMAL', 'FEASIBLE', 'INFEASIBLE'
    solve_time: float           # seconds
    penalty: int | None         # objective value (lower = better)
    events: list[dict] = field(default_factory=list)
    requests_processed: set = field(default_factory=set)


# ── Helpers ──

def _linearise(dt: datetime, epoch: date) -> int:
    """Convert a datetime to absolute minutes from midnight of epoch."""
    delta = datetime.combine(dt.date(), dt.time()) - datetime.combine(epoch, time(0, 0))
    return int(delta.total_seconds() // 60)


def _time_to_minutes(t: time) -> int:
    """Convert a time object to minutes from midnight."""
    return t.hour * 60 + t.minute


def _is_juvenile(team: Team) -> bool:
    """Check if team is juvenile (U10, U12, U14) for SC6."""
    ag = team.age_group.strip().upper() if team.age_group else ''
    return any(ag.startswith(j) for j in JUVENILE_AGE_GROUPS)


def _compatible_facilities(facilities: list, event_type: str) -> list[int]:
    """Return indices of facilities that can host the given event type (HC7).

    If a facility's suitable_for is empty, it accepts all event types.
    """
    compatible = []
    for i, fac in enumerate(facilities):
        if not fac.suitable_for or event_type in fac.suitable_for:
            compatible.append(i)
    return compatible


def _generate_slots(requests, date_from: date, date_until: date, epoch: date) -> list[SlotInstance]:
    """Generate SlotInstances from pending BookingRequests."""
    slots = []
    for req in requests:
        # Determine the effective date range (intersection of request range and solver range)
        effective_from = max(req.schedule_from, date_from)
        effective_until = min(req.schedule_until, date_until)

        if effective_from > effective_until:
            continue

        time_start = _time_to_minutes(req.preferred_time_start)
        time_end = _time_to_minutes(req.preferred_time_end)

        # One-time with target_date — create slot directly, skip day iteration
        if req.recurrence == 'once' and req.target_date:
            target = req.target_date
            if effective_from <= target <= effective_until:
                day_offset = (target - epoch).days * 24 * 60
                slots.append(SlotInstance(
                    request=req,
                    target_date=target,
                    duration=req.duration_minutes,
                    day_start_offset=day_offset,
                    time_start_min=time_start,
                    time_end_min=time_end,
                ))
            continue

        # Weekly or one-time without target_date (backward compat for old data)
        for day_name in req.preferred_days:
            weekday = DAY_NAME_TO_WEEKDAY.get(day_name.lower())
            if weekday is None:
                continue

            if req.recurrence == 'weekly':
                # Find all occurrences of this weekday in the effective range
                current = effective_from
                days_ahead = (weekday - current.weekday()) % 7
                current = current + timedelta(days=days_ahead)

                while current <= effective_until:
                    day_offset = (current - epoch).days * 24 * 60
                    slots.append(SlotInstance(
                        request=req,
                        target_date=current,
                        duration=req.duration_minutes,
                        day_start_offset=day_offset,
                        time_start_min=time_start,
                        time_end_min=time_end,
                    ))
                    current += timedelta(weeks=1)

            elif req.recurrence == 'once':
                # Fallback: find the first matching weekday in the effective range
                current = effective_from
                days_ahead = (weekday - current.weekday()) % 7
                current = current + timedelta(days=days_ahead)

                if current <= effective_until:
                    day_offset = (current - epoch).days * 24 * 60
                    slots.append(SlotInstance(
                        request=req,
                        target_date=current,
                        duration=req.duration_minutes,
                        day_start_offset=day_offset,
                        time_start_min=time_start,
                        time_end_min=time_end,
                    ))
                    break

    return slots


# ── Main Solver ──

def solve_schedule(date_from: date, date_until: date) -> SolverResult:
    """
    Generate a conflict-free schedule from pending BookingRequests.

    Reads BookingRequests (status='pending'), existing fixed/published Events,
    Facilities, and Teams. Builds a CP-SAT model with hard and soft constraints.
    Returns a SolverResult with proposed events ready for bulk creation.
    """
    epoch = date_from

    # ── Query DB ──
    facilities = list(Facility.objects.all())
    fac_index = {f.id: i for i, f in enumerate(facilities)}
    num_facilities = len(facilities)

    if num_facilities == 0:
        return SolverResult(success=False, status='INFEASIBLE', solve_time=0.0,
                            penalty=None, events=[], requests_processed=set())

    requests = list(BookingRequest.objects.filter(
        status='pending',
        schedule_from__lte=date_until,
        schedule_until__gte=date_from,
    ).select_related('team', 'preferred_facility'))

    if not requests:
        return SolverResult(success=True, status='OPTIMAL', solve_time=0.0,
                            penalty=0, events=[], requests_processed=set())

    fixed_events = list(Event.objects.filter(
        start_time__date__lte=date_until,
        end_time__date__gte=date_from,
    ).filter(
        models_q_fixed_or_published()
    ).select_related('facility', 'team'))

    teams = {t.id: t for t in Team.objects.all()}

    # ── Generate slots ──
    slots = _generate_slots(requests, date_from, date_until, epoch)

    if not slots:
        return SolverResult(success=True, status='OPTIMAL', solve_time=0.0,
                            penalty=0, events=[], requests_processed=set())

    # ── Build CP-SAT Model ──
    model = cp_model.CpModel()
    penalties = []

    # Per-facility interval collectors (for HC1 NoOverlap)
    fac_intervals = {i: [] for i in range(num_facilities)}

    # Per-team interval collectors (for HC3 team single location)
    team_intervals = {}

    # ── Add fixed events as constants (HC2) ──
    for ev in fixed_events:
        fac_idx = fac_index.get(ev.facility_id)
        if fac_idx is None:
            continue

        start_min = _linearise(ev.start_time, epoch)
        end_min = _linearise(ev.end_time, epoch)
        duration = end_min - start_min

        # HC4 — warmup buffer before matches/championships only
        if ev.event_type in MATCH_TYPES:
            fac_start = start_min - WARMUP_BUFFER
            fac_duration = duration + WARMUP_BUFFER
        else:
            fac_start = start_min
            fac_duration = duration

        fixed_interval = model.new_fixed_size_interval_var(fac_start, fac_duration, f'fixed_{ev.id}')
        fac_intervals[fac_idx].append(fixed_interval)

        # HC3 — team no-overlap (use actual duration, not padded)
        if ev.team_id:
            team_interval = model.new_fixed_size_interval_var(start_min, duration, f'fixed_team_{ev.id}')
            team_intervals.setdefault(ev.team_id, []).append(team_interval)

    # ── Add variable slots ──
    for idx, slot in enumerate(slots):
        req = slot.request
        team = req.team

        # HC7 — Facility-Type Compatibility: restrict to compatible facilities
        compatible_facs = _compatible_facilities(facilities, req.event_type)
        if not compatible_facs:
            # No compatible facility exists for this event type — skip slot
            continue

        # Start variable: bounded by preferred time window on that day
        # Absolute minutes = day_start_offset + time_in_day
        lb = slot.day_start_offset + slot.time_start_min
        ub = slot.day_start_offset + slot.time_end_min - slot.duration
        if ub < lb:
            ub = lb  # if window too tight, pin to start

        slot.start_var = model.new_int_var(lb, ub, f'start_{idx}')
        end_var = model.new_int_var(lb + slot.duration, ub + slot.duration, f'end_{idx}')
        model.add(end_var == slot.start_var + slot.duration)  # HC6 duration match
        if len(compatible_facs) == 1:
            slot.facility_var = model.new_constant(compatible_facs[0])
        else:
            slot.facility_var = model.new_int_var_from_domain(
                cp_model.Domain.from_values(compatible_facs), f'fac_{idx}'
            )

        # Main interval (for HC3 team overlap — uses actual duration)
        slot.interval_var = model.new_interval_var(
            slot.start_var, slot.duration, end_var, f'interval_{idx}'
        )

        # Per-facility optional intervals (for HC1 + HC4)
        # HC4: matches/championships get a warmup buffer BEFORE the event
        # Training and other events have no buffer (back-to-back is fine)
        if req.event_type in MATCH_TYPES:
            fac_start = model.new_int_var(lb - WARMUP_BUFFER, ub, f'fac_start_{idx}')
            model.add(fac_start == slot.start_var - WARMUP_BUFFER)
            fac_duration = slot.duration + WARMUP_BUFFER
            fac_end = model.new_int_var(lb + slot.duration, ub + slot.duration, f'fac_end_{idx}')
            model.add(fac_end == slot.start_var + slot.duration)
        else:
            fac_start = slot.start_var
            fac_duration = slot.duration
            fac_end = end_var

        for fi in compatible_facs:  # HC7: only create intervals for compatible facilities
            is_at_fac = model.new_bool_var(f'at_f{fi}_{idx}')
            slot.facility_bools[fi] = is_at_fac
            model.add(slot.facility_var == fi).only_enforce_if(is_at_fac)
            model.add(slot.facility_var != fi).only_enforce_if(is_at_fac.negated())

            opt_interval = model.new_optional_interval_var(
                fac_start, fac_duration, fac_end, is_at_fac, f'opt_f{fi}_{idx}'
            )
            slot.facility_intervals[fi] = opt_interval
            fac_intervals[fi].append(opt_interval)

        # HC3 — team no-overlap
        team_intervals.setdefault(team.id, []).append(slot.interval_var)

        # ── Soft Constraints ──
        priority_multiplier = req.priority  # 1, 2, or 3 (SC5)

        # SC1 — Preferred Facility
        if req.preferred_facility_id is not None:
            pref_fac_idx = fac_index.get(req.preferred_facility_id)
            if pref_fac_idx is not None:
                not_at_pref = model.new_bool_var(f'not_pref_fac_{idx}')
                model.add(slot.facility_var != pref_fac_idx).only_enforce_if(not_at_pref)
                model.add(slot.facility_var == pref_fac_idx).only_enforce_if(not_at_pref.negated())
                penalties.append(not_at_pref * PENALTY_WEIGHTS['preferred_facility'] * priority_multiplier)

        # SC3 — Preferred Time Window
        # Penalise if start is outside the preferred window
        pref_start_abs = slot.day_start_offset + slot.time_start_min
        pref_end_abs = slot.day_start_offset + slot.time_end_min - slot.duration
        if pref_end_abs > pref_start_abs:
            outside_window = model.new_bool_var(f'outside_time_{idx}')
            # If the window is the full domain, this var is never true
            # But we already bounded start_var to [lb, ub] so this is satisfied by domain
            # SC3 penalty applies if we ever need to expand the domain
            # For now, skip if domain already matches preferred window
            if lb == pref_start_abs and ub == pref_end_abs:
                pass  # already constrained to preferred window, no penalty needed
            else:
                penalties.append(outside_window * PENALTY_WEIGHTS['preferred_time'] * priority_multiplier)

        # SC4 — Usual Time
        if team.usual_time is not None:
            usual_abs = slot.day_start_offset + _time_to_minutes(team.usual_time)
            not_at_usual = model.new_bool_var(f'not_usual_{idx}')
            model.add(slot.start_var != usual_abs).only_enforce_if(not_at_usual)
            model.add(slot.start_var == usual_abs).only_enforce_if(not_at_usual.negated())

            weight = (PENALTY_WEIGHTS['usual_time_strict'] if not team.is_flexible
                      else PENALTY_WEIGHTS['usual_time_flexible'])
            penalties.append(not_at_usual * weight * priority_multiplier)

        # SC6 — Younger Teams Earlier (before 7pm)
        if _is_juvenile(team):
            evening_abs = slot.day_start_offset + EVENING_CUTOFF_HOUR * 60
            starts_late = model.new_bool_var(f'late_{idx}')
            model.add(slot.start_var >= evening_abs).only_enforce_if(starts_late)
            model.add(slot.start_var < evening_abs).only_enforce_if(starts_late.negated())
            penalties.append(starts_late * PENALTY_WEIGHTS['younger_earlier'] * priority_multiplier)

    # ── HC1 — No Facility Overlap (per facility) ──
    for fi in range(num_facilities):
        if len(fac_intervals[fi]) > 1:
            model.add_no_overlap(fac_intervals[fi])

    # ── HC3 — Team Single Location (per team, no time overlap) ──
    for team_id, intervals in team_intervals.items():
        if len(intervals) > 1:
            model.add_no_overlap(intervals)

    # ── Objective: minimise total penalty ──
    if penalties:
        model.minimize(sum(penalties))

    # ── Solve ──
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = SOLVER_TIMEOUT
    status_code = solver.solve(model)

    status_map = {
        cp_model.OPTIMAL: 'OPTIMAL',
        cp_model.FEASIBLE: 'FEASIBLE',
        cp_model.INFEASIBLE: 'INFEASIBLE',
        cp_model.MODEL_INVALID: 'MODEL_INVALID',
        cp_model.UNKNOWN: 'UNKNOWN',
    }
    status_str = status_map.get(status_code, 'UNKNOWN')

    if status_code not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return SolverResult(
            success=False, status=status_str,
            solve_time=solver.wall_time, penalty=None,
        )

    # ── Extract solution ──
    result_events = []
    processed_request_ids = set()

    for idx, slot in enumerate(slots):
        if slot.start_var is None:
            continue  # slot was skipped (no compatible facility — HC7)
        req = slot.request
        start_abs = solver.value(slot.start_var)
        fac_idx = solver.value(slot.facility_var)
        facility = facilities[fac_idx]

        # Convert absolute minutes back to datetime
        start_dt = datetime.combine(epoch, time(0, 0)) + timedelta(minutes=start_abs)
        end_dt = start_dt + timedelta(minutes=slot.duration)

        result_events.append({
            'request_id': req.id,
            'title': req.title,
            'start_time': start_dt,
            'end_time': end_dt,
            'facility_id': facility.id,
            'team_id': req.team_id,
            'event_type': req.event_type,
        })
        processed_request_ids.add(req.id)

    return SolverResult(
        success=True,
        status=status_str,
        solve_time=solver.wall_time,
        penalty=int(solver.objective_value) if penalties else 0,
        events=result_events,
        requests_processed=processed_request_ids,
    )


def models_q_fixed_or_published():
    """Return a Q object for fixed or published events."""
    from django.db.models import Q
    return Q(is_fixed=True) | Q(status='published')
