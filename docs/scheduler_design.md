# ClubSync Scheduler Design Document

## Document Information

| Field | Value |
|-------|-------|
| **Project** | ClubSync - GAA Club Scheduling System |
| **Author** | Conor Fee (C22414306) |
| **Version** | 1.0 |
| **Last Updated** | January 28, 2026 |
| **Status** | Design Phase |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Scheduling Approach](#3-scheduling-approach)
4. [Use Cases](#4-use-cases)
5. [Data Models](#5-data-models)
6. [Constraint Programming](#6-constraint-programming)
7. [Solver Algorithm](#7-solver-algorithm)
8. [System Workflow](#8-system-workflow)
9. [API Design](#9-api-design)
10. [UI Components](#10-ui-components)
11. [Future Enhancements](#11-future-enhancements)

---

## 1. Executive Summary

### Problem Statement

Irish GAA clubs struggle with weekly scheduling conflicts:
- **78%** of administrators experience conflicts regularly
- **89%** cite pitch double-bookings as the primary issue
- **100%** rely on WhatsApp for coordination
- **3-8 hours** spent weekly on manual scheduling

### Solution

ClubSync implements a **Full Automated Scheduling with Human Review** approach (Option C + D):

1. **Coaches** submit booking requests with preferences
2. **Admin** can also create requests and manual bookings
3. **Solver** (OR-Tools CP-SAT) generates optimal conflict-free schedule
4. **Bookings Officer** reviews, adjusts if needed, and approves
5. **Published schedule** visible to all club members

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Request submission | Coaches AND Admin | Distributed input, centralized control |
| Scheduling cycle | Monthly (flexible) | Aligns with fixture release cycle |
| Unscheduled handling | Show + Suggest alternatives | User-friendly, actionable feedback |
| Maintain usual times | Yes, configurable per team | Respects established routines |
| Approval authority | Admin only | Single source of truth |

---

## 2. System Overview

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLUBSYNC SYSTEM                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   INPUTS                        PROCESSING                    OUTPUTS   │
│   ──────                        ──────────                    ───────   │
│                                                                          │
│  ┌─────────────┐                                                         │
│  │   FIXED     │ County fixtures                                         │
│  │   EVENTS    │ (immovable)     ┌─────────────────────┐                │
│  │   (ICS)     │────────────────▶│                     │                │
│  └─────────────┘                 │                     │                │
│                                  │     OR-TOOLS        │   ┌──────────┐ │
│  ┌─────────────┐                 │     CP-SAT          │   │ PROPOSED │ │
│  │  BOOKING    │ Requests with   │     SOLVER          │──▶│ SCHEDULE │ │
│  │  REQUESTS   │ preferences     │                     │   │          │ │
│  │  (Coaches)  │────────────────▶│ • Hard constraints  │   └────┬─────┘ │
│  └─────────────┘                 │ • Soft constraints  │        │       │
│                                  │ • Optimization      │        ▼       │
│  ┌─────────────┐                 │                     │   ┌──────────┐ │
│  │   MANUAL    │ Direct bookings │                     │   │  ADMIN   │ │
│  │   EVENTS    │ by admin        └─────────────────────┘   │  REVIEW  │ │
│  │   (Admin)   │────────────────────────────────────────▶  │          │ │
│  └─────────────┘                                           └────┬─────┘ │
│                                                                  │       │
│                                                                  ▼       │
│                                                            ┌──────────┐ │
│                                                            │PUBLISHED │ │
│                                                            │ SCHEDULE │ │
│                                                            │          │ │
│                                                            │ Visible  │ │
│                                                            │ to all   │ │
│                                                            └──────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin / Bookings Officer** | Submit requests, create manual events, run solver, approve/publish schedules, manage facilities |
| **Coach / Manager** | Submit booking requests, view team schedule, see request status |
| **Viewer (Player/Parent)** | View published schedule only |

---

## 3. Scheduling Approach

### Automation Level: Full Automated + Human Review

ClubSync uses a **solver-first approach** where:

1. All scheduling requests are collected
2. The OR-Tools CP-SAT solver generates an optimal schedule
3. A human (Bookings Officer) reviews and approves

This differs from:
- **Manual systems** (spreadsheets, WhatsApp) - no automation
- **Validation-only systems** - prevent conflicts but don't solve them
- **Fully autonomous systems** - no human oversight

### Scheduling Cycle

| Aspect | Configuration |
|--------|---------------|
| **Primary cycle** | Monthly |
| **Flexibility** | Admin can choose any date range |
| **Typical workflow** | Generate schedule at start of month |
| **Re-runs** | Can re-run solver anytime (e.g., after cancellations) |

### Event Types

| Type | Description | Movable by Solver |
|------|-------------|-------------------|
| **Fixed Events** | County fixtures, committee meetings | NO |
| **Manual Events** | Admin-created bookings | Configurable |
| **Scheduled Requests** | Solver-placed from requests | YES |

---

## 4. Use Cases

### Use Case Diagram

```
                              ┌─────────────────────────────────────┐
                              │           CLUBSYNC                  │
                              └─────────────────────────────────────┘
                                              │
        ┌───────────────────────────────────────────────────────────────┐
        │                                                               │
   ┌────┴────┐                        ┌────┴────┐                ┌─────┴─────┐
   │  ADMIN  │                        │  COACH  │                │  VIEWER   │
   └────┬────┘                        └────┬────┘                └─────┬─────┘
        │                                  │                           │
        │  ┌──────────────────────────┐    │                           │
        ├──│ UC1: Import Fixed Events │    │                           │
        │  └──────────────────────────┘    │                           │
        │                                  │                           │
        │  ┌──────────────────────────┐    │  ┌─────────────────────┐  │
        ├──│ UC2: Create Manual Event │    ├──│ UC3: Submit Request │  │
        │  └──────────────────────────┘    │  └─────────────────────┘  │
        │                                  │                           │
        │  ┌──────────────────────────┐    │  ┌─────────────────────┐  │
        ├──│ UC4: View All Requests   │    ├──│ UC5: View My Reqs   │  │
        │  └──────────────────────────┘    │  └─────────────────────┘  │
        │                                  │                           │
        │  ┌──────────────────────────┐    │                           │
        ├──│ UC6: Run Solver          │    │                           │
        │  └──────────────────────────┘    │                           │
        │                                  │                           │
        │  ┌──────────────────────────┐    │                           │
        ├──│ UC7: Review Schedule     │    │                           │
        │  └──────────────────────────┘    │                           │
        │                                  │                           │
        │  ┌──────────────────────────┐    │                           │
        ├──│ UC8: Adjust (Drag-Drop)  │    │                           │
        │  └──────────────────────────┘    │                           │
        │                                  │                           │
        │  ┌──────────────────────────┐    │                           │
        ├──│ UC9: Approve & Publish   │    │                           │
        │  └──────────────────────────┘    │                           │
        │                                  │                           │
        │  ┌──────────────────────────┐    │  ┌─────────────────────┐  │  ┌─────────────────────┐
        └──│ UC10: View Schedule      │────┴──│ UC10: View Schedule │──┴──│ UC10: View Schedule │
           └──────────────────────────┘       └─────────────────────┘     └─────────────────────┘
```

### Detailed Use Cases

#### UC1: Import Fixed Events

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Admin is logged in |
| **Description** | Import county fixtures from ICS file (Foireann export) |
| **Main Flow** | 1. Admin uploads ICS file<br>2. System parses events<br>3. System shows preview with conflicts highlighted<br>4. Admin confirms import<br>5. Events created with `is_fixed=True` |
| **Postcondition** | Fixed events appear on calendar, immovable |

#### UC2: Create Manual Event

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Admin is logged in |
| **Description** | Create an event directly (bypassing request system) |
| **Main Flow** | 1. Admin opens create form<br>2. Enters: title, facility, date/time, team<br>3. System validates no conflicts<br>4. Event created immediately |
| **Postcondition** | Event appears on calendar |
| **Alternative** | If conflict detected, show error and suggest alternatives |

#### UC3: Submit Booking Request

| Field | Description |
|-------|-------------|
| **Actor** | Coach (or Admin) |
| **Precondition** | User is logged in |
| **Description** | Submit a request for a time slot with preferences |
| **Main Flow** | 1. User opens request form<br>2. Enters: team, title, duration, preferred facility, preferred days/times, priority, flexibility setting<br>3. System saves as pending request<br>4. Confirmation shown |
| **Postcondition** | Request visible in pending queue |

#### UC4: View All Requests

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Admin is logged in |
| **Description** | View all pending requests from all teams |
| **Main Flow** | 1. Admin opens requests dashboard<br>2. System displays all pending requests<br>3. Shows: team, duration, preferences, priority<br>4. Highlights any obvious conflicts |
| **Postcondition** | Admin has overview of scheduling needs |

#### UC5: View My Requests

| Field | Description |
|-------|-------------|
| **Actor** | Coach |
| **Precondition** | Coach is logged in |
| **Description** | View status of own team's requests |
| **Main Flow** | 1. Coach opens my requests page<br>2. System displays requests for their team(s)<br>3. Shows status: pending/scheduled/rejected |
| **Postcondition** | Coach knows request status |

#### UC6: Run Solver

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | At least one pending request exists |
| **Description** | Generate optimal schedule using OR-Tools |
| **Main Flow** | 1. Admin selects date range (e.g., "February 2026")<br>2. Admin clicks "Generate Schedule"<br>3. System runs OR-Tools solver<br>4. System displays proposed schedule<br>5. Shows scheduled vs unscheduled requests |
| **Postcondition** | Proposed schedule ready for review |
| **Alternative** | If some requests can't be scheduled, show with explanations and alternatives |

#### UC7: Review Proposed Schedule

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Solver has generated a schedule |
| **Description** | Review the proposed schedule before publishing |
| **Main Flow** | 1. Admin views proposed schedule on calendar<br>2. Events color-coded by status<br>3. Can see which requests were/weren't scheduled<br>4. Can see compromises made (e.g., "Got Training Pitch instead of Main Pitch") |
| **Postcondition** | Admin understands the proposed schedule |

#### UC8: Adjust Schedule (Drag-Drop)

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Proposed schedule exists |
| **Description** | Manually adjust events via drag-and-drop |
| **Main Flow** | 1. Admin drags event to new time/facility<br>2. System validates change in real-time<br>3. If valid, event moves<br>4. If conflict, show error and revert |
| **Postcondition** | Schedule adjusted |
| **Note** | Fixed events cannot be dragged |

#### UC9: Approve and Publish

| Field | Description |
|-------|-------------|
| **Actor** | Admin |
| **Precondition** | Schedule reviewed and adjusted |
| **Description** | Publish schedule for all to see |
| **Main Flow** | 1. Admin clicks "Approve & Publish"<br>2. System marks all events as published<br>3. System updates request statuses to "scheduled"<br>4. Schedule visible to all users |
| **Postcondition** | Schedule is live |

#### UC10: View Published Schedule

| Field | Description |
|-------|-------------|
| **Actor** | All users |
| **Precondition** | Schedule has been published |
| **Description** | View the club's schedule |
| **Main Flow** | 1. User opens calendar view<br>2. System displays published events<br>3. Can filter by facility or team<br>4. Can switch between week/month view |
| **Postcondition** | User knows when/where activities are scheduled |

---

## 5. Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     USER        │       │     TEAM        │       │    FACILITY     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ email           │       │ name            │       │ name            │
│ password_hash   │       │ age_group       │       │ type            │
│ role            │───┐   │ usual_day       │   ┌───│ capacity        │
│ first_name      │   │   │ usual_time      │   │   │ operating_start │
│ last_name       │   │   │ usual_facility  │───┤   │ operating_end   │
└─────────────────┘   │   │ is_flexible     │   │   └─────────────────┘
                      │   │ coach           │───┘           │
                      │   └─────────────────┘               │
                      │           │                         │
                      │           │                         │
                      │   ┌───────┴───────┐                 │
                      │   │               │                 │
                      ▼   ▼               ▼                 │
              ┌─────────────────┐   ┌─────────────────┐     │
              │ BOOKING_REQUEST │   │     EVENT       │     │
              ├─────────────────┤   ├─────────────────┤     │
              │ id              │   │ id              │     │
              │ team            │───│ title           │     │
              │ requested_by    │   │ start_time      │     │
              │ title           │   │ end_time        │     │
              │ duration_mins   │   │ facility        │─────┘
              │ preferred_fac   │   │ team            │
              │ preferred_days  │   │ is_fixed        │
              │ preferred_start │   │ is_published    │
              │ preferred_end   │   │ created_from    │───┐
              │ priority        │   │ status          │   │
              │ status          │   └─────────────────┘   │
              │ scheduled_event │─────────────────────────┘
              │ rejection_reason│
              │ created_at      │
              └─────────────────┘
```

### Model Definitions

#### User Model (Extended Django User)

```python
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('coach', 'Coach'),
        ('viewer', 'Viewer'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    phone = models.CharField(max_length=20, blank=True)
```

#### Team Model (New)

```python
class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    # e.g., "U14 Boys", "Senior Men", "Ladies"

    age_group = models.CharField(max_length=50, blank=True)
    # e.g., "U10", "U14", "Minor", "Senior"

    # Usual training pattern (soft constraint)
    usual_day = models.CharField(max_length=20, blank=True)
    # e.g., "tuesday", "thursday"

    usual_time = models.TimeField(null=True, blank=True)
    # e.g., 18:00

    usual_facility = models.ForeignKey(
        'Facility',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Flexibility setting
    is_flexible = models.BooleanField(default=True)
    # If False, solver strongly prefers usual times

    # Coach assignment
    coach = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={'role': 'coach'}
    )

    def __str__(self):
        return self.name
```

#### Facility Model (Enhanced)

```python
class Facility(models.Model):
    TYPE_CHOICES = [
        ('pitch', 'Pitch'),
        ('hall', 'Hall'),
        ('gym', 'Gym'),
    ]

    name = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)

    # Operating hours
    operating_start = models.TimeField(default='06:00')
    operating_end = models.TimeField(default='22:00')

    # Capacity (for future use)
    capacity = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
```

#### Event Model (Enhanced)

```python
class Event(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('proposed', 'Proposed'),
        ('published', 'Published'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name='events'
    )

    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events'
    )

    # Fixed events (county fixtures) cannot be moved
    is_fixed = models.BooleanField(
        default=False,
        help_text="County fixtures cannot be moved by solver"
    )

    # Publication status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )

    # Link to original request (if created from request)
    created_from_request = models.ForeignKey(
        'BookingRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['start_time']

    def clean(self):
        """Validate no overlapping bookings on same facility"""
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")

        overlapping = Event.objects.filter(
            facility=self.facility,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk).exclude(status='cancelled')

        if overlapping.exists():
            raise ValidationError(
                f"This facility is already booked at that time: {overlapping.first()}"
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
```

#### BookingRequest Model (New)

```python
class BookingRequest(models.Model):
    PRIORITY_CHOICES = [
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('partial', 'Partially Scheduled'),
        ('rejected', 'Rejected'),
    ]

    # Who's requesting
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='booking_requests'
    )
    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='booking_requests'
    )

    # What they need
    title = models.CharField(max_length=200)
    # e.g., "Weekly Training", "Match Preparation"

    duration_minutes = models.IntegerField()
    # e.g., 90

    # How often (for recurring requests)
    recurrence = models.CharField(
        max_length=20,
        choices=[
            ('once', 'One-time'),
            ('weekly', 'Weekly'),
        ],
        default='weekly'
    )

    # Preferences (soft constraints for solver)
    preferred_facility = models.ForeignKey(
        Facility,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Leave blank for 'any suitable facility'"
    )

    preferred_days = models.JSONField(
        default=list,
        help_text="e.g., ['monday', 'wednesday', 'thursday']"
    )

    preferred_time_start = models.TimeField(
        help_text="Earliest acceptable start time"
    )

    preferred_time_end = models.TimeField(
        help_text="Latest acceptable end time"
    )

    # Priority
    priority = models.IntegerField(
        choices=PRIORITY_CHOICES,
        default=2
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # Result
    scheduled_event = models.ForeignKey(
        Event,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_request'
    )

    rejection_reason = models.TextField(
        blank=True,
        help_text="Explanation if request couldn't be scheduled"
    )

    alternative_suggestions = models.JSONField(
        default=list,
        help_text="Suggested alternative times if preferred wasn't available"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Date range for scheduling
    schedule_from = models.DateField()
    schedule_until = models.DateField()

    def __str__(self):
        return f"{self.team.name} - {self.title} ({self.get_status_display()})"
```

---

## 6. Constraint Programming

### Overview

ClubSync uses **Google OR-Tools CP-SAT Solver** for constraint satisfaction and optimization.

**Why OR-Tools?**
- Free and open-source
- Excellent Python integration
- Handles complex scheduling constraints
- Fast solving (sub-second for typical club schedules)
- Supports both hard constraints and soft optimization

### Hard Constraints

Hard constraints **must** be satisfied. If any hard constraint is violated, the schedule is invalid.

| ID | Constraint | Description | Implementation |
|----|------------|-------------|----------------|
| **HC1** | No Facility Overlap | Two events cannot use the same facility at the same time | `AddNoOverlap()` per facility |
| **HC2** | Fixed Events Immovable | Events with `is_fixed=True` cannot be moved | Exclude from solver variables |
| **HC3** | Team Single Location | A team cannot be scheduled in two places at the same time | `AddNoOverlap()` per team |
| **HC4** | 15-Minute Changeover | Minimum 15-minute gap between consecutive events on same facility | Add buffer to intervals |
| **HC5** | Operating Hours | Events must be within facility operating hours | Domain restriction on variables |
| **HC6** | Request Duration | Scheduled event must match requested duration | Fixed interval size |

### Soft Constraints

Soft constraints are **preferences**. The solver tries to satisfy them but will compromise if necessary.

| ID | Constraint | Description | Weight |
|----|------------|-------------|--------|
| **SC1** | Preferred Facility | Schedule at requested facility if possible | High |
| **SC2** | Preferred Day | Schedule on requested day(s) if possible | High |
| **SC3** | Preferred Time | Schedule within requested time window | High |
| **SC4** | Usual Time (Team Routine) | Non-flexible teams stay at usual time | Very High |
| **SC5** | Priority Respect | Higher priority requests get better slots | Medium |
| **SC6** | Minimize Changes | Prefer times close to usual patterns | Medium |
| **SC7** | Younger Teams Earlier | U10-U14 prefer 5-7 PM slots | Low |

### Constraint Weighting

```python
CONSTRAINT_WEIGHTS = {
    'preferred_facility': 100,
    'preferred_day': 80,
    'preferred_time': 60,
    'usual_time_strict': 200,      # For non-flexible teams
    'usual_time_flexible': 50,     # For flexible teams
    'priority_high': 150,
    'priority_medium': 100,
    'priority_low': 50,
    'younger_teams_early': 30,
}
```

### Feasibility vs Optimality

1. **Feasibility Phase**: Find ANY valid schedule satisfying all hard constraints
2. **Optimization Phase**: Among valid schedules, find one maximizing soft constraint satisfaction

If no feasible solution exists:
- Identify conflicting requests
- Suggest which request(s) to remove or modify
- Offer alternative times for rejected requests

---

## 7. Solver Algorithm

### Pseudocode

```python
def solve_schedule(requests, fixed_events, facilities, date_range):
    """
    Generate an optimal schedule using OR-Tools CP-SAT.

    Args:
        requests: List[BookingRequest] - Pending booking requests
        fixed_events: List[Event] - Immovable county fixtures
        facilities: List[Facility] - Available facilities
        date_range: Tuple[date, date] - Scheduling period

    Returns:
        ScheduleResult with proposed events and unscheduled requests
    """

    model = CpModel()

    # =========================================
    # 1. CREATE VARIABLES
    # =========================================

    scheduled_events = []

    for request in requests:
        # For weekly recurring requests, create one event per week
        weeks = get_weeks_in_range(date_range)

        for week in weeks:
            event_var = ScheduledEventVar(
                request=request,
                week=week,
            )

            # Start time variable (in minutes from week start)
            event_var.start = model.NewIntVar(
                min_time(request, week),
                max_time(request, week),
                f'start_{request.id}_{week}'
            )

            # Duration is fixed
            event_var.duration = request.duration_minutes

            # End time derived
            event_var.end = event_var.start + event_var.duration

            # Facility assignment variable
            event_var.facility = model.NewIntVarFromDomain(
                get_allowed_facilities(request),
                f'facility_{request.id}_{week}'
            )

            # Interval variable for overlap constraints
            event_var.interval = model.NewIntervalVar(
                event_var.start,
                event_var.duration,
                event_var.end,
                f'interval_{request.id}_{week}'
            )

            scheduled_events.append(event_var)

    # =========================================
    # 2. ADD HARD CONSTRAINTS
    # =========================================

    # HC1: No facility overlap (including fixed events)
    for facility in facilities:
        facility_intervals = []

        # Add fixed events as fixed intervals
        for event in fixed_events:
            if event.facility_id == facility.id:
                fixed_interval = model.NewFixedInterval(
                    event.start_minutes,
                    event.duration_minutes,
                    f'fixed_{event.id}'
                )
                facility_intervals.append(fixed_interval)

        # Add variable intervals (only when assigned to this facility)
        for ev in scheduled_events:
            # Create optional interval, active only if facility matches
            is_at_facility = model.NewBoolVar(f'{ev.name}_at_{facility.id}')
            model.Add(ev.facility == facility.id).OnlyEnforceIf(is_at_facility)
            model.Add(ev.facility != facility.id).OnlyEnforceIf(is_at_facility.Not())

            optional_interval = model.NewOptionalIntervalVar(
                ev.start,
                ev.duration,
                ev.end,
                is_at_facility,
                f'{ev.name}_interval_at_{facility.id}'
            )
            facility_intervals.append(optional_interval)

        # No overlap constraint
        model.AddNoOverlap(facility_intervals)

    # HC3: Team single location
    for team in teams:
        team_intervals = [
            ev.interval
            for ev in scheduled_events
            if ev.request.team_id == team.id
        ]
        model.AddNoOverlap(team_intervals)

    # HC4: 15-minute changeover buffer
    # (Implemented by extending intervals by 15 mins for overlap check)

    # HC5: Operating hours
    for ev in scheduled_events:
        facility = ev.request.preferred_facility or facilities[0]
        model.Add(ev.start >= facility.operating_start_minutes)
        model.Add(ev.end <= facility.operating_end_minutes)

    # =========================================
    # 3. ADD SOFT CONSTRAINTS (Optimization)
    # =========================================

    penalties = []

    for ev in scheduled_events:
        request = ev.request
        team = request.team

        # SC1: Preferred facility penalty
        if request.preferred_facility:
            not_preferred = model.NewBoolVar(f'{ev.name}_not_pref_facility')
            model.Add(ev.facility != request.preferred_facility.id).OnlyEnforceIf(not_preferred)
            penalties.append(not_preferred * WEIGHTS['preferred_facility'])

        # SC2: Preferred day penalty
        for day in ['monday', 'tuesday', ...]:
            if day not in request.preferred_days:
                is_on_day = is_event_on_day(model, ev, day)
                penalties.append(is_on_day * WEIGHTS['preferred_day'])

        # SC3: Preferred time penalty
        time_deviation = model.NewIntVar(0, MAX_DEVIATION, f'{ev.name}_time_dev')
        model.Add(time_deviation >= ev.start - request.preferred_start_minutes)
        model.Add(time_deviation >= request.preferred_start_minutes - ev.start)
        penalties.append(time_deviation * WEIGHTS['preferred_time'] // 60)

        # SC4: Usual time (team routine)
        if team.usual_day and team.usual_time:
            usual_start = get_usual_start_minutes(team, ev.week)
            deviation_from_usual = model.NewIntVar(0, MAX_DEV, f'{ev.name}_usual_dev')
            model.Add(deviation_from_usual >= ev.start - usual_start)
            model.Add(deviation_from_usual >= usual_start - ev.start)

            weight = WEIGHTS['usual_time_strict'] if not team.is_flexible else WEIGHTS['usual_time_flexible']
            penalties.append(deviation_from_usual * weight // 60)

    # =========================================
    # 4. OBJECTIVE: Minimize total penalty
    # =========================================

    model.Minimize(sum(penalties))

    # =========================================
    # 5. SOLVE
    # =========================================

    solver = CpSolver()
    solver.parameters.max_time_in_seconds = 30  # Timeout

    status = solver.Solve(model)

    # =========================================
    # 6. EXTRACT RESULTS
    # =========================================

    if status in [OPTIMAL, FEASIBLE]:
        result = ScheduleResult(success=True)

        for ev in scheduled_events:
            result.events.append(ProposedEvent(
                request=ev.request,
                start_time=minutes_to_datetime(solver.Value(ev.start), ev.week),
                end_time=minutes_to_datetime(solver.Value(ev.end), ev.week),
                facility_id=solver.Value(ev.facility),
            ))

        return result

    else:
        # Infeasible - find conflicting requests
        return ScheduleResult(
            success=False,
            unscheduled=identify_conflicts(requests),
            suggestions=generate_alternatives(requests)
        )
```

### Solver Output

```python
@dataclass
class ScheduleResult:
    success: bool
    events: List[ProposedEvent]          # Successfully scheduled
    unscheduled: List[UnscheduledInfo]   # Couldn't be scheduled
    solver_status: str                    # OPTIMAL, FEASIBLE, INFEASIBLE
    solve_time_seconds: float
    total_penalty: int                    # Lower is better

@dataclass
class ProposedEvent:
    request: BookingRequest
    start_time: datetime
    end_time: datetime
    facility: Facility
    compromises: List[str]  # e.g., ["Got Training Pitch instead of Main Pitch"]

@dataclass
class UnscheduledInfo:
    request: BookingRequest
    reason: str                           # Why it couldn't be scheduled
    alternatives: List[AlternativeSlot]   # Suggested alternatives
    conflicting_with: List[Event]         # What it conflicts with

@dataclass
class AlternativeSlot:
    start_time: datetime
    end_time: datetime
    facility: Facility
    penalty: int  # How far from preferences
```

---

## 8. System Workflow

### Monthly Scheduling Workflow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        MONTHLY SCHEDULING WORKFLOW                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WEEK BEFORE MONTH START                                                     │
│  ────────────────────────                                                    │
│                                                                              │
│    ┌─────────────────┐                                                       │
│    │ 1. Admin imports │  Upload ICS from Foireann                           │
│    │    fixed events  │  County fixtures locked in                          │
│    └────────┬────────┘                                                       │
│             │                                                                │
│             ▼                                                                │
│    ┌─────────────────┐                                                       │
│    │ 2. Request      │  Coaches notified: "Submit your requests"            │
│    │    collection   │  Deadline: e.g., 25th of previous month              │
│    │    window opens │                                                       │
│    └────────┬────────┘                                                       │
│             │                                                                │
│             ▼                                                                │
│    ┌─────────────────┐     ┌─────────────────┐                              │
│    │ Coaches submit  │     │ Admin can also  │                              │
│    │ requests with   │     │ create requests │                              │
│    │ preferences     │     │ or manual events│                              │
│    └────────┬────────┘     └────────┬────────┘                              │
│             │                       │                                        │
│             └───────────┬───────────┘                                        │
│                         │                                                    │
│                         ▼                                                    │
│              ┌─────────────────┐                                             │
│              │ 3. Admin reviews│  Check all requests received                │
│              │    requests     │  Contact coaches with missing submissions   │
│              └────────┬────────┘                                             │
│                       │                                                      │
│                       ▼                                                      │
│              ┌─────────────────┐                                             │
│              │ 4. Run solver   │  Click "Generate Schedule"                  │
│              │                 │  OR-Tools processes all requests            │
│              └────────┬────────┘                                             │
│                       │                                                      │
│            ┌──────────┴──────────┐                                           │
│            │                     │                                           │
│            ▼                     ▼                                           │
│   ┌─────────────────┐   ┌─────────────────┐                                 │
│   │ All scheduled   │   │ Some couldn't   │                                 │
│   │ successfully    │   │ be scheduled    │                                 │
│   └────────┬────────┘   └────────┬────────┘                                 │
│            │                     │                                           │
│            │                     ▼                                           │
│            │            ┌─────────────────┐                                  │
│            │            │ Review conflicts│  See why, see alternatives       │
│            │            │ Contact coaches │  Negotiate compromises           │
│            │            └────────┬────────┘                                  │
│            │                     │                                           │
│            └──────────┬──────────┘                                           │
│                       │                                                      │
│                       ▼                                                      │
│              ┌─────────────────┐                                             │
│              │ 5. Admin review │  View proposed schedule                     │
│              │    & adjust     │  Drag-drop adjustments                      │
│              └────────┬────────┘                                             │
│                       │                                                      │
│                       ▼                                                      │
│              ┌─────────────────┐                                             │
│              │ 6. Approve &    │  Schedule goes live                         │
│              │    publish      │  All users can view                         │
│              └────────┬────────┘                                             │
│                       │                                                      │
│                       ▼                                                      │
│              ┌─────────────────┐                                             │
│              │ 7. Coaches      │  Automatic status update                    │
│              │    notified     │  "Your request was scheduled"               │
│              └─────────────────┘                                             │
│                                                                              │
│  DURING THE MONTH                                                            │
│  ────────────────                                                            │
│                                                                              │
│    • Ad-hoc changes via drag-drop (re-validates automatically)               │
│    • Cancellations handled by admin                                          │
│    • Re-run solver if major changes needed                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Request States

```
                    ┌─────────────┐
                    │   PENDING   │  Submitted, awaiting solver
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ SCHEDULED │ │  PARTIAL  │ │ REJECTED  │
       │           │ │           │ │           │
       │ All weeks │ │ Some weeks│ │ Couldn't  │
       │ scheduled │ │ scheduled │ │ schedule  │
       └───────────┘ └───────────┘ └───────────┘
```

---

## 9. API Design

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teams/` | List all teams |
| `POST` | `/api/teams/` | Create team |
| `GET` | `/api/teams/{id}/` | Get team details |
| `PUT` | `/api/teams/{id}/` | Update team |
| `GET` | `/api/requests/` | List booking requests (filtered by user role) |
| `POST` | `/api/requests/` | Submit booking request |
| `GET` | `/api/requests/{id}/` | Get request details |
| `PUT` | `/api/requests/{id}/` | Update request |
| `DELETE` | `/api/requests/{id}/` | Cancel request |
| `POST` | `/api/schedule/generate/` | Run solver for date range |
| `GET` | `/api/schedule/proposed/` | Get proposed (unpublished) schedule |
| `POST` | `/api/schedule/publish/` | Publish proposed schedule |
| `GET` | `/api/schedule/conflicts/` | Get current conflicts/issues |

### Example: Generate Schedule Request

```http
POST /api/schedule/generate/
Content-Type: application/json

{
    "date_from": "2026-02-01",
    "date_until": "2026-02-28",
    "include_requests": "pending",  // or "all"
    "solver_timeout": 30
}
```

### Example: Generate Schedule Response

```json
{
    "success": true,
    "solver_status": "OPTIMAL",
    "solve_time_seconds": 2.3,
    "total_penalty": 450,

    "scheduled": [
        {
            "request_id": 1,
            "title": "U14 Boys Training",
            "events": [
                {
                    "start_time": "2026-02-04T18:00:00",
                    "end_time": "2026-02-04T19:30:00",
                    "facility": "Main Pitch",
                    "compromises": []
                },
                {
                    "start_time": "2026-02-11T18:00:00",
                    "end_time": "2026-02-11T19:30:00",
                    "facility": "Main Pitch",
                    "compromises": []
                }
            ]
        }
    ],

    "unscheduled": [
        {
            "request_id": 5,
            "title": "U10 Skills Session",
            "reason": "No available slot on preferred days (Sat/Sun)",
            "conflicting_with": ["U13 Football Blitz", "Senior Match"],
            "alternatives": [
                {
                    "day": "Friday",
                    "time": "17:00-18:00",
                    "facility": "Training Pitch",
                    "penalty": 80
                }
            ]
        }
    ]
}
```

---

## 10. UI Components

### Admin Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CLUBSYNC - Admin Dashboard                              [User] [Logout]     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  February 2026                    [< Prev]  [Today]  [Next >]           │ │
│  │                                                                         │ │
│  │  [Import ICS]  [New Request]  [Generate Schedule]  [Publish]            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  PENDING REQUESTS    │  │                                              │ │
│  │  ─────────────────   │  │                   CALENDAR                   │ │
│  │                      │  │                                              │ │
│  │  ▸ U14 Boys (90min)  │  │    Mon    Tue    Wed    Thu    Fri    Sat   │ │
│  │    Tue/Thu 6-8pm     │  │   ┌─────┬─────┬─────┬─────┬─────┬─────┐     │ │
│  │    Main Pitch        │  │   │     │█████│     │█████│     │░░░░░│     │ │
│  │    [Edit] [Remove]   │  │ 6 │     │U14  │     │U14  │     │FIXED│     │ │
│  │                      │  │ PM│     │Boys │     │Boys │     │Match│     │ │
│  │  ▸ Senior Men (2hr)  │  │   │     │█████│     │█████│     │░░░░░│     │ │
│  │    Mon/Wed 7-9pm     │  │   ├─────┼─────┼─────┼─────┼─────┼─────┤     │ │
│  │    Main Pitch        │  │   │█████│     │█████│     │     │     │     │ │
│  │    [Edit] [Remove]   │  │ 7 │Snr  │     │Snr  │     │     │     │     │ │
│  │                      │  │ PM│Men  │     │Men  │     │     │     │     │ │
│  │  ▸ Ladies (90min)    │  │   │█████│     │█████│     │     │     │     │ │
│  │    Tue 7-9pm         │  │   └─────┴─────┴─────┴─────┴─────┴─────┘     │ │
│  │    Any facility      │  │                                              │ │
│  │    [Edit] [Remove]   │  │   Legend: █ Scheduled  ░ Fixed  ▓ Conflict  │ │
│  │                      │  │                                              │ │
│  │  ───────────────     │  └──────────────────────────────────────────────┘ │
│  │  UNSCHEDULED (1)     │                                                   │
│  │                      │  ┌──────────────────────────────────────────────┐ │
│  │  ⚠ U10 Skills       │  │  SOLVER STATUS                               │ │
│  │    Conflict: Sat     │  │  ─────────────────                           │ │
│  │    [See alternatives]│  │  Last run: Jan 28, 14:32                     │ │
│  │                      │  │  Status: OPTIMAL                             │ │
│  └──────────────────────┘  │  Scheduled: 12/13 requests                   │ │
│                            │  [View Details]                              │ │
│                            └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Coach Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CLUBSYNC - Coach Dashboard                              [Coach] [Logout]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Welcome, Coach Murphy!                            Team: U14 Boys            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  MY REQUESTS                                              [+ New Request]│ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  ✓ Weekly Training                                                      │ │
│  │    Status: SCHEDULED                                                    │ │
│  │    Tue & Thu 6:00-7:30 PM @ Main Pitch                                 │ │
│  │    [View on Calendar]                                                   │ │
│  │                                                                         │ │
│  │  ⏳ Match Preparation (one-time)                                        │ │
│  │    Status: PENDING                                                      │ │
│  │    Requested: Sat 10:00 AM, 2 hours                                     │ │
│  │    [Edit] [Cancel]                                                      │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  TEAM SCHEDULE - February 2026                                          │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                         │ │
│  │  Tue 4th    18:00-19:30   Training        Main Pitch                   │ │
│  │  Thu 6th    18:00-19:30   Training        Main Pitch                   │ │
│  │  Sat 8th    14:30-16:30   MATCH vs Bray   Main Pitch     [FIXED]       │ │
│  │  Tue 11th   18:00-19:30   Training        Main Pitch                   │ │
│  │  ...                                                                    │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Request Form Modal

```
┌──────────────────────────────────────────────────────────┐
│  New Booking Request                              [X]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Team:          [U14 Boys               ▼]              │
│                                                          │
│  Title:         [Weekly Training          ]              │
│                                                          │
│  Duration:      [90    ] minutes                         │
│                                                          │
│  Recurrence:    (•) Weekly  ( ) One-time                 │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│  PREFERENCES                                             │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Preferred Facility:                                     │
│  [Main Pitch           ▼]  ☐ Any suitable facility      │
│                                                          │
│  Preferred Days:                                         │
│  ☐ Mon  ☑ Tue  ☐ Wed  ☑ Thu  ☐ Fri  ☐ Sat  ☐ Sun       │
│                                                          │
│  Preferred Time Window:                                  │
│  From: [18:00]  To: [20:00]                             │
│                                                          │
│  Priority:      ( ) Low  (•) Medium  ( ) High           │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│  SCHEDULE PERIOD                                         │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  From: [2026-02-01]  Until: [2026-02-28]                │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│                    [Cancel]  [Submit Request]            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 11. Future Enhancements

### Phase 2 (Post-FYP)

| Feature | Description |
|---------|-------------|
| **Predictive Analytics** | Use historical data to forecast facility demand |
| **Weather Integration** | Auto-suggest indoor alternatives when rain forecast |
| **Email Notifications** | Notify coaches when schedule published/changed |
| **Mobile App** | Native iOS/Android apps |
| **Foireann Integration** | Auto-import fixtures from official GAA system |
| **Multi-Club** | Support multiple clubs in one system |

### Phase 3 (Long-term)

| Feature | Description |
|---------|-------------|
| **Machine Learning** | Learn team preferences from historical patterns |
| **Referee Assignment** | Auto-assign referees to matches |
| **Equipment Booking** | Track equipment allocation |
| **Parent Portal** | RSVP, carpool coordination |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Booking Request** | A team's request for a time slot, not yet scheduled |
| **Event** | A scheduled activity on the calendar |
| **Fixed Event** | County fixture that cannot be moved |
| **Hard Constraint** | Must be satisfied for valid schedule |
| **Soft Constraint** | Preference, can be compromised |
| **Solver** | OR-Tools CP-SAT algorithm that generates schedules |
| **Changeover Buffer** | 15-minute gap between events on same facility |
| **Usual Time** | Team's historical/preferred regular time slot |

---

## Appendix B: References

- Google OR-Tools Documentation: https://developers.google.com/optimization
- CP-SAT Solver Guide: https://developers.google.com/optimization/cp/cp_solver
- FullCalendar Documentation: https://fullcalendar.io/docs
- Django REST Framework: https://www.django-rest-framework.org/

---

*Document created: January 28, 2026*
*For: ClubSync Final Year Project - TU Dublin*
