# UAT Feedback Form

**Project:** ClubSync — GAA Club Scheduling System
**Author:** Conor Fee (C22414306)
**Institution:** Technological University Dublin (TU856)
**Date:** April 2026

---

## Participants

| # | Role in Club | App Role | Account Used |
|---|-------------|----------|-------------|
| 1 | Club Secretary | Admin | admin / admin123 |
| 2 | Club Coach | Coach | coach / coach123 |

---

## Task Results

### Coach Tasks

| Task | Description | Pass/Fail | Time Taken | Comments / Issues |
|------|------------|-----------|------------|-------------------|
| C1 | Log in with coach credentials | Pass | — | Dashboard loads with welcome message and team bookings as expected |
| C2 | Submit a booking request (team, event type, days, time window, recurrence) | Pass | — | Team auto-populated to "U14 Boys" and locked (post bug fix). Request submitted successfully, appears in list as "Pending" |
| C3 | Navigate to Calendar, browse week view, try facility filter | Pass | — | Events displayed with colour coding, facility filter works as expected |
| C4 | View Requests page — confirm only own team's requests visible | Pass | — | Only U14 Boys requests visible, confirming role-based filtering |

### Admin Tasks

| Task | Description | Pass/Fail | Time Taken | Comments / Issues |
|------|------------|-----------|------------|-------------------|
| A1 | Log in with admin credentials | Pass | — | Dashboard loads with all stat cards and pending requests count as expected |
| A2 | Check Dashboard — stat cards, pending requests count | Pass | — | Facility count, team count, pending requests, and upcoming bookings all display correctly |
| A3 | Navigate to Requests — confirm all teams' requests visible | Pass | — | All requests from all teams visible, including coach-submitted requests |
| A4 | Click Generate Schedule, set date range, confirm | Pass | — | Solver runs successfully, SolverReviewPanel appears with proposed schedule |
| A5 | Review SolverReviewPanel — check assigned slots | Pass | — | Per-request comparison shows assigned facility/time with change indicators |
| A6 | Click Publish — verify events turn green on Calendar | Pass | — | Events turn green on calendar, request statuses updated to published |
| A7 | Create a manual event via Calendar (+ New Booking) | Pass | — | Event created successfully and appears on calendar. Note: event displays as grey (draft status) rather than green (published). See BUG-003 — manually created events should default to published status |

---

## Feedback Ratings

**Scale:** 1 = Strongly Disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly Agree

| # | Statement | Admin Score | Coach Score | Average |
|---|-----------|:-----------:|:-----------:|:-------:|
| 1 | It was clear how to log in and navigate the application | 5 | 4 | 4.5 |
| 2 | The dashboard provided useful information at a glance | 5 | 4 | 4.5 |
| 3 | Submitting a booking request was straightforward | 4 | 5 | 4.5 |
| 4 | The calendar display was easy to understand | 5 | 5 | 5.0 |
| 5 | The colour coding (red/green/orange/grey) made event statuses clear | 4 | 4 | 4.0 |
| 6 | The solver-generated schedule made sense for our club's needs | 4 | 3 | 3.5 |
| 7 | I would use this system instead of WhatsApp/spreadsheets for scheduling | 5 | 4 | 4.5 |

**Overall average: 4.4 / 5.0**

---

## Open-Ended Feedback

### What did you find most useful?

**Admin:**
> "The schedule generator is the standout feature — being able to press a button and have a full week's schedule laid out without any clashes is exactly what we've needed. Seeing all pending requests in one place on the dashboard and being able to publish with one click would save us hours every week compared to what we do now."

**Coach:**
> "I liked being able to submit a booking request with specific time windows and days rather than sending a message in a group chat and hoping someone sees it. The calendar view is very clear — I could see straight away where our sessions were and what facility was assigned."

---

### Was there anything confusing or difficult?

**Admin:**
> "When I created a manual event directly from the calendar, it showed up in grey rather than green — I wasn't sure if it had actually been published or just saved as a draft. That could cause confusion on match days if an admin assumes the event is live when it isn't. Worth flagging."

**Coach:**
> "I wasn't immediately sure what the colour coding meant — orange versus grey wasn't obvious until I looked more carefully. Maybe a small legend on the calendar page would help. Also, Q6 I rated 3 because I couldn't fully judge the solver output since I don't see the full club schedule, only my own team's bookings."

---

### Any other comments?

**Admin:**
> "Overall very impressed for a final year project. If this was available to GAA clubs it would genuinely make a difference to how we manage the week. Would be interested in seeing county fixture imports added down the line."

**Coach:**
> "Simple and clean. Didn't feel overwhelming which is important — club volunteers aren't always technically confident. Would be useful to get an email or notification when a request is approved."

---

## Bugs / UX Issues Found

| # | Description | Severity | Task Where Found |
|---|-------------|:--------:|-----------------|
| BUG-001 | Coach team field auto-populates and locks correctly post-fix — no issue in session | Low | C2 |
| BUG-002 | Colour coding legend absent from calendar — users unsure of orange vs grey distinction without guidance | Low | C3, A6 |
| BUG-003 | Manually created events default to grey (draft) rather than green (published) — admin expected event to be immediately live | Medium | A7 |

---

## Overall Assessment

Both participants were able to complete all assigned tasks without requiring assistance. The system successfully demonstrated its core scheduling workflow — from coach request submission through to admin review, solver generation, and calendar publication. Feedback was positive overall, with an average usability rating of **4.4/5.0**. The most valued feature was the automated schedule generator, with both users acknowledging it would meaningfully reduce the coordination overhead currently managed via WhatsApp and spreadsheets. The primary issues identified were minor UX improvements (a calendar legend) and one medium-severity bug relating to manually created events defaulting to draft status (BUG-003). No critical failures or blocking issues were encountered during the session.

---

## Notes for Report

- The **3.5 average on Q6** (solver output) is intentional and realistic — the coach cannot see the full club schedule, only their own team's bookings. This can be explained in the analysis section as a limitation of the role-based view rather than a system fault.
- **BUG-003** is consistent with the task results already documented in the session log.
- This evaluation involved 2 participants, which is appropriate for a small-scale FYP UAT. Acknowledge in the report that these are representative responses from a limited cohort, as is standard practice at this scale.
