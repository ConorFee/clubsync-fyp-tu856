# UAT and Usability Evaluation Plan

**Created:** 2026-04-02
**Target:** Complete before April 16 (report submission April 17)
**Participants:** 2-3 members from An Tochar GAA (club admin/secretary + 1-2 coaches)

---

## Setup

- Use the deployed Render app (production URL)
- Create real user accounts for participants (or use existing sample accounts)
- Assign roles: admin for the club secretary, coach for coaches
- Ensure sample data is loaded (facilities, teams, some existing events)

---

## UAT Tasks

Each participant completes their role-specific tasks while you observe. Record pass/fail and any comments.

### Coach Tasks

| # | Task | Steps | Expected Outcome |
|---|------|-------|------------------|
| C1 | Log in | Enter credentials, reach dashboard | Dashboard shows welcome message, team bookings |
| C2 | Submit booking request | Navigate to Requests > New Request, fill form (team, event type, days, time window, recurrence), submit | Request appears in list with "Pending" status |
| C3 | View calendar | Navigate to Calendar, browse week view | Events displayed with colour coding, facility filter works |
| C4 | View own requests | Navigate to Requests page | Only their team's requests visible |

### Admin Tasks

| # | Task | Steps | Expected Outcome |
|---|------|-------|------------------|
| A1 | Log in | Enter credentials, reach dashboard | Dashboard shows all stat cards, pending requests count |
| A2 | Review pending requests | Navigate to Requests page | All pending requests from all teams visible |
| A3 | Generate schedule | Click Generate, set date range, confirm | Solver runs, SolverReviewPanel appears with proposed schedule |
| A4 | Review solver output | Inspect SolverReviewPanel | Per-request comparison shows assigned facility/time, change indicators |
| A5 | Publish schedule | Click Publish | Events turn green on calendar, request statuses update to published |
| A6 | Create manual event | Navigate to Calendar, click "+ New Booking", fill form | Event appears on calendar with correct colour |

---

## UAT Results Template

Record after each session:

| Task | User | Role | Completed? | Time Taken | Issues/Comments |
|------|------|------|-----------|------------|-----------------|
| C1 | | Coach | | | |
| C2 | | Coach | | | |
| ... | | | | | |

---

## Usability Feedback Form

Hand out after the session (paper or Google Form). 5-10 minutes to complete.

### Rating Questions (1 = Strongly Disagree, 5 = Strongly Agree)

1. It was clear how to log in and navigate the application.
2. The dashboard provided useful information at a glance.
3. Submitting a booking request was straightforward.
4. The calendar display was easy to understand.
5. The colour coding (red/green/orange/grey) made event statuses clear.
6. The solver-generated schedule made sense for our club's needs.
7. I would use this system instead of WhatsApp/spreadsheets for scheduling.

### Open Questions

8. What did you find most useful about the system?
9. Was there anything confusing or difficult to use?
10. Any features you would like to see added?

---

## What to Record for the Report

- **UAT results table** — task, user role, pass/fail, comments (for Section 6.2 or 6.3)
- **Usability ratings** — average scores per question (for Section 6.3)
- **Qualitative quotes** — 2-3 notable comments from participants
- **Any issues found** — bugs or UX problems discovered during testing
- **Overall assessment** — did the system meet the users' scheduling needs?

---

## Logistics

- **Duration:** ~20 minutes per participant (tasks + feedback form)
- **Total time:** ~1 hour for 2-3 participants
- **Location:** In person at the club, or remote via screen share
- **Recording:** Take notes during observation, collect feedback forms after
