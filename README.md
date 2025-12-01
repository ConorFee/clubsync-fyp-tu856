# ClubSync - GAA Club Scheduling System

**Author:** Conor Fee (C22414306)  
**Supervisor:** Paul Laird  
**Institution:** Technological University Dublin  
**Academic Year:** 2025/26

---

## Project Overview

ClubSync is a web-based scheduling application designed for Irish GAA clubs to eliminate weekly scheduling conflicts through intelligent constraint programming and an intuitive user interface. The system combines automated conflict-free scheduling with real-time facility management.

**Problem Statement:** 78% of GAA clubs experience regular scheduling conflicts, with 89% citing pitch double-bookings as the primary issue. Clubs currently rely on fragmented tools like WhatsApp and Excel, resulting in volunteer burnout and coordination chaos.

**Solution:** ClubSync provides a single source of truth for weekly activity scheduling, automatically generating conflict-free timetables while respecting fixed county fixtures, limited facilities, and volunteer availability.

---

## Architecture

```
clubsync-fyp-tu856/
├── backend/          # Django REST Framework API
├── frontend/         # React + TypeScript UI
└── README.md
```

**Technology Stack:**
- **Backend:** Django 5.2.8 + Django REST Framework + PostgreSQL
- **Frontend:** React 19 + TypeScript + Vite + FullCalendar
- **Solver:** Google OR-Tools CP-SAT
- **Deployment:** Docker + DigitalOcean

---

## Feature 1: Data Layer & Django Backend

**Status:**  **Implemented & Tested**

### Database Schema (PostgreSQL)

**Models:**
- `Facility` - Represents club facilities (pitches, halls, gyms)
  - Fields: `id`, `name`, `type`
- `Event` - Scheduled activities and fixtures
  - Fields: `id`, `title`, `start_time`, `end_time`, `facility_id`, `is_fixed`, `team_name`
  - **Hard Constraint:** Overlap prevention enforced in `save()` method

**ACID Compliance:**
- Atomicity: All-or-nothing event creation
- Consistency: Constraints enforced before/after transactions
- Isolation: Concurrent booking prevention
- Durability: Permanent storage guarantee

### REST API Endpoints

Exposed endpoints for frontend integration:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/facilities/` | List all facilities |
| `GET` | `/api/events/` | List all events (ordered by start_time) |
| `POST` | `/api/events/` | Create new event (with validation) |
| `POST` | `/api/schedule/solve/` | Validate schedule with OR-Tools |

**CORS Configuration:** Enabled for frontend development (`localhost:5173`)

### OR-Tools Constraint Solver

**Implementation:** `scheduler/views.py` - `solve_schedule()`

**Hard Constraints Enforced:**
1. No overlapping bookings on same facility
2. County fixtures (`is_fixed=True`) cannot be moved
3. 15-minute changeover buffer between events
4. Team cannot be in two locations simultaneously

**Solver Output:**
```json
{
  "status": true,
  "message": "Schedule is conflict-free and feasible!",
  "non_fixed_events_checked": 12,
  "solver_status": "OPTIMAL"
}
```

### Sample Data Loader

**Management Command:** `python manage.py load_sample_data`

Populates database with realistic An Tóchar GAA club data:
- 4 facilities (Main Pitch, Training Pitch, Hall, Gym)
- 15+ sample events including fixed county fixtures
- Representative weekly schedule scenarios

---

## Feature 2: React Frontend (In Progress)

**Status:** **Foundation Complete, UI Components In Development**

### Technology Setup

**Framework:** React 19 + TypeScript + Vite  
**Key Libraries:**
- `axios` - HTTP client for Django API
- `@fullcalendar/react` - Calendar UI component
- `date-fns` - Date manipulation utilities

### Type Safety

**TypeScript Interfaces:** `frontend/src/types/types.ts`

```typescript
export interface EventType {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  facility: { name: string };
  is_fixed: boolean;
}

export interface FacilityType {
  id: number;
  name: string;
  type: string;
}
```

### API Service Layer

**Location:** `frontend/src/api/events.ts`

Type-safe API client with typed responses:
```typescript
export async function fetchEvents(): Promise<EventType[]>
export async function fetchFacilities(): Promise<FacilityType[]>
```

### Planned Components

- `WeeklySchedule` - Main calendar view with FullCalendar
- `FacilitySidebar` - Real-time facility availability
- `EventCard` - Individual event display with conflict indicators
- `SolverStatus` - OR-Tools validation results

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 15+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Load sample data
python manage.py load_sample_data

# Start Django server
python manage.py runserver
```

**Backend running at:** `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

**Frontend running at:** `http://localhost:5173`

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
python manage.py test
```

**Test Coverage:**
- Model validation (overlap prevention)
- API endpoint responses
- OR-Tools solver logic

### API Testing

**Example cURL requests:**

```bash
# Get all events
curl http://localhost:8000/api/events/

# Validate schedule
curl -X POST http://localhost:8000/api/schedule/solve/
```

---

## 📊 Current Progress

### Completed (Interim Submission)

- [x] PostgreSQL database schema with ACID compliance
- [x] Django REST API with CORS configuration
- [x] OR-Tools CP-SAT solver integration
- [x] Hard constraint enforcement (overlap prevention)
- [x] Sample data from An Tóchar GAA club
- [x] Management command for data loading
- [x] React + TypeScript frontend foundation
- [x] TypeScript type definitions
- [x] API service layer with type safety

### In Progress (Week 12-13)

- [ ] WeeklySchedule component with FullCalendar
- [ ] Facility dashboard UI
- [ ] Frontend-backend integration
- [ ] Event creation form
- [ ] Real-time validation feedback

### Planned (Week 14-20)

- [ ] ICS file import for county fixtures
- [ ] Team model implementation
- [ ] Unit test suite (>80% coverage)
- [ ] Docker containerization
- [ ] Deployment to Render
- [ ] User Acceptance Testing with An Tóchar GAA
- [ ] Predictive analytics (volunteer demand forecasting)

---

## Documentation

- **Interim Report:** Detailed system analysis, design, and methodology
- **Presentation Slides:** Architecture diagrams and demo walkthrough
- **API Documentation:** Endpoint specifications and response formats
- **Type Definitions:** TypeScript interfaces for frontend-backend contract

---

##  Acknowledgments

- **Supervisor:** Paul Laird (TU Dublin)
- **Data Source:** An Tóchar GAA Club
- **Survey Participants:** Club administrators, coaches, and members

---

**Last Updated:** December 2025  
**Project Status:** Interim Submission - MVP Foundation Complete