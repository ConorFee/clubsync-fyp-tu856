# Week 1 Test Scenarios: Event CRUD

## Document Purpose

This document outlines the **manual test scenarios** for Event CRUD functionality, defining the expected system behavior for both successful operations (happy paths) and failure cases (unhappy paths).

**Use Case Reference:** UC2 - Create Manual Event (from SCHEDULER_DESIGN.md)

**Constraint Reference:** HC1 - No Facility Overlap (Hard Constraint)

---

## Test Scenario Overview

| Category | Count | Description |
|----------|-------|-------------|
| Happy Paths | 5 | Successful operations |
| Unhappy Paths | 6 | Validation failures and conflicts |
| Edge Cases | 4 | Boundary conditions |

---

## Happy Paths (Success Scenarios)

### HP1: Create Standard Event

**Scenario:** Admin creates a new training session

**Preconditions:**
- User is logged in as Admin
- Main Pitch has no events on Feb 5th, 18:00-19:30

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Click "New Event" button | Modal opens with empty form |
| 2 | Enter Title: "U14 Football Training" | Field accepts input |
| 3 | Select Facility: "Main Pitch" | Dropdown selection made |
| 4 | Enter Start: Feb 5, 2026, 18:00 | Date/time accepted |
| 5 | Enter End: Feb 5, 2026, 19:30 | Date/time accepted |
| 6 | Enter Team Name: "U14 Boys" | Optional field accepted |
| 7 | Leave "Fixed Event" unchecked | Default state |
| 8 | Click "Save" | Loading indicator shown |

**Expected Result:**
- API returns HTTP 201 Created
- Modal closes automatically
- Calendar refreshes
- New event appears on calendar in **green** (scheduled color)
- Event appears in sidebar event list
- Event details match input

**Postconditions:**
- Event persisted in database
- Event visible to all users viewing the calendar

---

### HP2: Create Fixed Event (County Fixture)

**Scenario:** Admin creates an immovable county fixture

**Preconditions:**
- User is logged in as Admin
- No existing events conflict with the time slot

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Click "New Event" button | Modal opens |
| 2 | Enter Title: "Senior Championship vs Bray" | Field accepts input |
| 3 | Select Facility: "Main Pitch" | Selection made |
| 4 | Enter Start: Feb 8, 2026, 14:30 | Accepted |
| 5 | Enter End: Feb 8, 2026, 16:30 | Accepted |
| 6 | Enter Team Name: "Senior Men" | Accepted |
| 7 | **Check "Fixed Event" checkbox** | Checkbox selected |
| 8 | Click "Save" | Processing |

**Expected Result:**
- API returns HTTP 201 Created
- Event created with `is_fixed: true`
- Event appears on calendar in **red** (fixed event color)
- Event cannot be moved via drag-and-drop (Week 2)
- Event excluded from solver optimization (Week 3)

**Why This Matters:**
Fixed events represent county fixtures that are set by external bodies (e.g., Wicklow GAA). The club cannot reschedule these, so the system must treat them as immovable anchors when generating schedules.

---

### HP3: Edit Existing Event

**Scenario:** Admin updates event details

**Preconditions:**
- Event "U14 Training" exists on Feb 5, 18:00-19:30
- New time slot (19:30-21:00) is available

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Click on "U14 Training" event on calendar | Modal opens with pre-populated data |
| 2 | Verify form shows existing values | Title, facility, times pre-filled |
| 3 | Change Title to "U14 Match Preparation" | Field updates |
| 4 | Change End Time to 20:00 | Field updates |
| 5 | Click "Save" | Processing |

**Expected Result:**
- API returns HTTP 200 OK
- Modal closes
- Calendar refreshes
- Event shows updated title and duration
- Original event ID preserved (not a new event)

---

### HP4: Delete Event

**Scenario:** Admin removes a cancelled training session

**Preconditions:**
- Event "U16 Training" exists
- Event is not a fixed county fixture

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Locate event in sidebar event list | Event card visible |
| 2 | Click "Delete" button on event card | Confirmation dialog appears |
| 3 | Dialog asks: "Delete this event?" | Cancel and Confirm options shown |
| 4 | Click "Confirm" | Processing |

**Expected Result:**
- API returns HTTP 204 No Content
- Confirmation dialog closes
- Calendar refreshes
- Event no longer visible on calendar
- Event removed from sidebar list

**Alternative Flow (Cancel):**
- User clicks "Cancel" in confirmation dialog
- Dialog closes
- Event remains unchanged

---

### HP5: Create Event on Different Facility (Concurrent Booking)

**Scenario:** Two events at the same time on different facilities

**Preconditions:**
- Event A exists: "Senior Training" on **Main Pitch**, Feb 5, 18:00-19:30
- Training Pitch is available at that time

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Click "New Event" | Modal opens |
| 2 | Enter Title: "U12 Skills Session" | Accepted |
| 3 | Select Facility: **"Training Pitch"** | Different from Event A |
| 4 | Enter Start: Feb 5, 2026, 18:00 | Same time as Event A |
| 5 | Enter End: Feb 5, 2026, 19:30 | Same duration as Event A |
| 6 | Click "Save" | Processing |

**Expected Result:**
- API returns HTTP 201 Created (Success!)
- Both events visible on calendar at 18:00
- No conflict because **different facilities**

**Why This Matters:**
This proves the no-overlap constraint is **per facility**, not global. A GAA club can run multiple activities simultaneously across different facilities.

---

## Unhappy Paths (Failure Scenarios)

### UP1: Facility Time Conflict (Primary Constraint)

**Scenario:** Admin tries to double-book a facility

**Preconditions:**
- Event exists: "Senior Training" on Main Pitch, Feb 5, 18:00-19:30

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Click "New Event" | Modal opens |
| 2 | Enter Title: "U16 Training" | Accepted |
| 3 | Select Facility: "Main Pitch" | Same as existing event |
| 4 | Enter Start: Feb 5, 2026, 18:30 | Overlaps with existing |
| 5 | Enter End: Feb 5, 2026, 20:00 | Overlaps with existing |
| 6 | Click "Save" | Processing |

**Expected Result:**
- API returns HTTP 400 Bad Request
- Modal remains open (does not close)
- Error message displayed: **"This facility is already booked at that time: Senior Training (18:00-19:30)"**
- User can modify the form and retry

**Recovery Flow:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 7 | Change Start to 19:30 | No longer overlaps |
| 8 | Change End to 21:00 | Valid time range |
| 9 | Click "Save" | Processing |
| 10 | - | HTTP 201 Created - Success |

**Constraint Enforced:** HC1 - No Facility Overlap

---

### UP2: Missing Required Field (Title)

**Scenario:** Admin submits form without title

**Preconditions:**
- Modal is open for new event

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Leave Title field empty | - |
| 2 | Fill in all other fields correctly | - |
| 3 | Click "Save" | Validation triggered |

**Expected Result:**
- Form validation prevents submission OR API returns HTTP 400
- Error message: **"Title is required"**
- Modal remains open
- Title field highlighted with error state

---

### UP3: Missing Required Field (Facility)

**Scenario:** Admin submits without selecting facility

**Preconditions:**
- Modal is open for new event

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Enter Title: "U14 Training" | Accepted |
| 2 | Do not select a facility | Dropdown shows placeholder |
| 3 | Fill in times correctly | - |
| 4 | Click "Save" | Validation triggered |

**Expected Result:**
- Error message: **"Facility is required"**
- Modal remains open
- Facility dropdown highlighted with error state

---

### UP4: Invalid Time Range (End Before Start)

**Scenario:** Admin enters end time before start time

**Preconditions:**
- Modal is open for new event

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Enter all required fields | - |
| 2 | Enter Start: Feb 5, 2026, 19:00 | Accepted |
| 3 | Enter End: Feb 5, 2026, 18:00 | End is before start |
| 4 | Click "Save" | Validation triggered |

**Expected Result:**
- API returns HTTP 400 Bad Request
- Error message: **"End time must be after start time"**
- Modal remains open
- Time fields may be highlighted

---

### UP5: Edit Causes New Conflict

**Scenario:** Admin edits event to overlap with another

**Preconditions:**
- Event A: "Senior Training", Main Pitch, Feb 5, 18:00-19:00
- Event B: "U16 Training", Main Pitch, Feb 5, 20:00-21:00

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Click on Event B to edit | Modal opens with Event B data |
| 2 | Change Start to 18:30 | Would overlap with Event A |
| 3 | Change End to 19:30 | Would overlap with Event A |
| 4 | Click "Save" | Processing |

**Expected Result:**
- API returns HTTP 400 Bad Request
- Error message: **"This facility is already booked at that time: Senior Training"**
- Modal remains open with edited values
- Original Event B unchanged in database

---

### UP6: Network Error

**Scenario:** API request fails due to network issue

**Preconditions:**
- Backend server is unreachable

**Steps:**
| # | User Action | System Response |
|---|-------------|-----------------|
| 1 | Fill in valid event details | - |
| 2 | Click "Save" | Request attempted |

**Expected Result:**
- Network error caught
- Error message: **"Unable to save event. Please check your connection and try again."**
- Modal remains open
- User can retry when connection restored

---

## Edge Cases

### EC1: Adjacent Events (Back-to-Back)

**Scenario:** Two events with no gap between them

**Setup:**
- Event A: Main Pitch, 18:00-19:00
- Event B: Main Pitch, 19:00-20:00 (starts exactly when A ends)

**Expected Result:**
- **Allowed** - No overlap
- End time is exclusive (18:00-19:00 means "until 19:00", not "through 19:00")
- Both events can exist

**Note:** In Week 3, we will implement HC4 (15-minute changeover buffer) which would require a gap between events. For Week 1, back-to-back is permitted.

---

### EC2: Exact Duplicate Time

**Scenario:** New event with identical time slot

**Setup:**
- Existing: Main Pitch, 18:00-19:00
- Attempted: Main Pitch, 18:00-19:00 (exact same)

**Expected Result:**
- **Rejected** - Complete overlap
- Error: "This facility is already booked at that time"

---

### EC3: New Event Contains Existing

**Scenario:** New event fully encompasses an existing event

**Setup:**
- Existing: Main Pitch, 18:00-19:00
- Attempted: Main Pitch, 17:00-20:00 (surrounds existing)

**Expected Result:**
- **Rejected** - Overlap detected
- The existing event falls within the new event's time range

---

### EC4: Existing Event Contains New

**Scenario:** New event falls within an existing event

**Setup:**
- Existing: Main Pitch, 17:00-21:00
- Attempted: Main Pitch, 18:00-19:00 (inside existing)

**Expected Result:**
- **Rejected** - Overlap detected
- The new event falls within the existing event's time range

---

## Overlap Detection Logic

The backend validates overlaps using this logic:

```
Two events overlap if:
  event1.start < event2.end AND event1.end > event2.start
  AND event1.facility == event2.facility
```

**Visual Representation:**

```
Timeline:  17:00   18:00   19:00   20:00   21:00
           |-------|-------|-------|-------|

Case 1: No Overlap (Adjacent)
Event A:   [=======]
Event B:           [=======]
Result:    ALLOWED

Case 2: Partial Overlap
Event A:   [=======]
Event B:       [=======]
Result:    REJECTED

Case 3: Complete Overlap
Event A:   [=======]
Event B:   [=======]
Result:    REJECTED

Case 4: Containment
Event A:   [===============]
Event B:       [===]
Result:    REJECTED
```

---

## Summary Table

| Scenario | Type | Expected Outcome | Constraint |
|----------|------|------------------|------------|
| HP1: Create standard event | Happy | 201 Created | - |
| HP2: Create fixed event | Happy | 201 Created, red color | - |
| HP3: Edit existing event | Happy | 200 OK | - |
| HP4: Delete event | Happy | 204 No Content | - |
| HP5: Different facility same time | Happy | 201 Created | Per-facility |
| UP1: Same facility overlap | Unhappy | 400 Bad Request | HC1 |
| UP2: Missing title | Unhappy | 400 Bad Request | Validation |
| UP3: Missing facility | Unhappy | 400 Bad Request | Validation |
| UP4: End before start | Unhappy | 400 Bad Request | Validation |
| UP5: Edit causes conflict | Unhappy | 400 Bad Request | HC1 |
| UP6: Network error | Unhappy | Error message | - |
| EC1: Adjacent events | Edge | Allowed | - |
| EC2: Exact duplicate | Edge | Rejected | HC1 |
| EC3: New contains existing | Edge | Rejected | HC1 |
| EC4: Existing contains new | Edge | Rejected | HC1 |

---

## Supervisor Discussion Points

### Key Questions to Address:

1. **"How does the system prevent double-bookings?"**
   - Backend validation in `Event.save()` method
   - Checks for overlapping times on same facility
   - Returns 400 error with descriptive message

2. **"What happens when there's a conflict?"**
   - User sees error message explaining the conflict
   - Modal stays open so user can adjust
   - User can change time or facility to resolve

3. **"Can two events happen at the same time?"**
   - Yes, if on different facilities
   - No, if on the same facility (this is the core constraint)

4. **"What about fixed events?"**
   - Marked with `is_fixed=true`
   - Display in red on calendar
   - Cannot be moved by drag-drop (Week 2)
   - Excluded from solver optimization (Week 3)

5. **"How will this connect to the automated scheduler?"**
   - Same constraint (HC1) will be enforced by OR-Tools solver
   - Solver will use this validation when generating schedules
   - Manual events and solver-generated events follow same rules

---

## Next Steps After Supervisor Meeting

1. Implement EventFormModal component
2. Connect to backend API
3. Test each scenario from this document
4. Document actual results vs expected
5. Fix any discrepancies

---

*Document Created: January 29, 2026*
*For: ClubSync FYP - Week 1 Sprint*
*Author: Conor Fee (C22414306)*
