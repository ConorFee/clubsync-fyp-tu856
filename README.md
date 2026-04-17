# ClubSync - GAA Club Scheduling System

**Author:** Conor Fee (C22414306)
**Supervisor:** Paul Laird
**Institution:** Technological University Dublin (TU856)
**Academic Year:** 2025/26

---

## Project Overview

ClubSync is a web-based scheduling application designed for Irish GAA clubs to eliminate weekly scheduling conflicts through constraint programming. The system combines automated conflict-free schedule generation with a generate-review-publish workflow, giving club administrators full control over the final timetable.

**Problem:** 84% of GAA club administrators experience regular scheduling conflicts, with clubs relying on WhatsApp and spreadsheets to coordinate across multiple teams and limited facilities.

**Solution:** ClubSync provides a single platform where coaches submit booking requests with preferences, and an OR-Tools CP-SAT solver generates optimal conflict-free schedules that administrators can review and publish.

---

## Architecture

```
clubsync/
├── backend/           # Django REST Framework API + CP-SAT solver
│   ├── scheduler/     # Models, views, serializers, solver, tests
│   ├── clubsync_project/  # Django settings, URLs
│   └── manage.py
├── frontend/          # React + TypeScript SPA
│   ├── src/
│   │   ├── api/       # Type-safe Axios API layer
│   │   ├── components/  # UI components (EventFormModal, SolverReviewPanel, etc.)
│   │   ├── pages/     # 7 page components
│   │   ├── context/   # AuthContext (session management)
│   │   └── types/     # TypeScript interfaces
│   └── vite.config.ts
├── docs/              # Supporting documentation (test cases, UAT results)
├── Dockerfile         # Multi-stage build (Node + Python)
└── README.md
```

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.2.8 + Django REST Framework + PostgreSQL |
| Frontend | React 19 + TypeScript + Vite + FullCalendar + Bootstrap 5 |
| Solver | Google OR-Tools CP-SAT (Constraint Programming) |
| Deployment | Docker (multi-stage) + Render (auto-deploy on push) |
| Auth | Django session-based with CSRF protection |

---

## Features

### Two-Path Scheduling System

- **Path 1 (Direct):** Admin creates events manually via the calendar modal. Overlap prevention enforced at the database level.
- **Path 2 (Solver):** Coaches submit booking requests with preferences. Admin runs the CP-SAT solver to generate an optimal schedule, reviews proposed assignments in the SolverReviewPanel, then publishes or discards.

### Constraint Programming Solver

The solver formulates scheduling as a Constraint Satisfaction and Optimisation Problem (CSOP):

- **7 Hard Constraints:** No facility overlap (HC1), fixed events immovable (HC2), team single-location (HC3), warmup buffer for matches (HC4), duration match (HC6), facility-type compatibility (HC7)
- **6 Soft Constraints:** Preferred facility (SC1), preferred day (SC2), preferred time window (SC3), usual time adherence (SC4), priority multiplier (SC5), younger teams earlier (SC6)
- **Solve time:** Typically under 0.03 seconds

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| Admin | Full access — create events, manage requests, run solver, publish schedules |
| Coach | Submit booking requests for assigned team, view own requests, view calendar |
| Viewer | Read-only calendar access |

### Colour-Coded Calendar

- Red = Fixed (county fixtures, immovable)
- Green = Published (confirmed schedule)
- Orange = Proposed (solver output, pending review)
- Grey = Draft

---

## Data Models

| Model | Purpose |
|-------|---------|
| Facility | Club facilities with type and suitable event types (JSON) |
| Team | Age group, usual training day/time/facility, flexibility flag |
| Event | Scheduled events with status, facility FK, team FK, fixed flag |
| BookingRequest | Coach preferences — facility, days, time window, recurrence, auto-derived priority |
| UserProfile | Links Django User to role (admin/coach/viewer) and team |

---

## API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|-----------|
| GET | `/api/facilities/` | List facilities | Authenticated |
| GET/POST | `/api/events/` | List/create events | Auth / Admin |
| GET/POST | `/api/requests/` | List/create booking requests | Coach or Admin |
| POST | `/api/schedule/generate/` | Run CP-SAT solver | Admin |
| POST | `/api/schedule/publish/` | Publish proposed schedule | Admin |
| POST | `/api/schedule/discard/` | Discard proposed schedule | Admin |
| POST | `/api/auth/login/` | Session login | Public |
| POST | `/api/auth/logout/` | Session logout | Authenticated |
| GET | `/api/auth/me/` | Current user info | Authenticated |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 15+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv clubsync_venv
source clubsync_venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Create backend/.env with:
#   SECRET_KEY=your-secret-key
#   DB_NAME=clubsync_db
#   DB_USER=clubsync
#   DB_PASSWORD=your-password
#   DB_HOST=localhost
#   DB_PORT=5432

# Run migrations
python manage.py migrate

# Load sample data
python manage.py load_sample_data

# Start server
python manage.py runserver
```

Backend runs at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api/* to Django)
npm run dev
```

Frontend runs at `http://localhost:5173`

### Test Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| coach | coach123 | Coach (U14 Boys) |
| viewer | viewer123 | Viewer |

### Sample Data

The `load_sample_data` command creates: 4 facilities, 8 teams, 3 fixed events (county fixtures), 9 booking requests, and 3 user accounts.

---

## Testing

```bash
cd backend
source clubsync_venv/bin/activate
python manage.py test
```

**42 automated tests** across 4 modules:

| Module | Tests | Coverage |
|--------|-------|----------|
| `test_models.py` | 9 | Model validation, overlap prevention, priority derivation |
| `test_serializers.py` | 5 | Serializer validation, time window checks, auto-derived fields |
| `test_solver.py` | 11 | Hard constraints (HC1-HC7), soft constraints (SC1, SC3), solver status |
| `test_api.py` | 17 | CRUD operations, permissions, generate/publish/discard workflow |

Manual test scenarios (15 cases covering happy paths, unhappy paths, and edge cases) are documented in `docs/manual_test_cases.md`.

---

## Deployment

ClubSync is deployed using a multi-stage Docker build on Render:

- **Stage 1:** Node builds the React frontend (`npm run build`)
- **Stage 2:** Python serves Django + static files via Gunicorn + WhiteNoise
- SPA catch-all route serves `index.html` for client-side routing
- Auto-deploys on push to `master`

---

## Documentation

| Document | Location |
|----------|----------|
| Manual test scenarios | `docs/manual_test_cases.md` |
| UAT plan and methodology | `docs/uat_usability_plan.md` |
| UAT feedback results | `docs/UAT_Feedback_Form.md` |
| Bug documentation | `docs/bugs_to_investigate.md` |
| Bug fix analysis | `docs/bug_fix_coach_team_filter.md` |

---

## Acknowledgements

- **Supervisor:** Paul Laird (TU Dublin)
- **Partner Club:** An Tochar GAA
- **Survey Participants:** Club administrators, coaches, and members who provided requirements data

---

**Last Updated:** April 2026
**Project Status:** Final Submission Complete
