# Lecture Lens Page Specification

## GLOBAL RULES
- Routes: `src/lib/routes.ts` is the single source of truth for sidebar items.
- Actions: All clicks call Zod-validated APIs, check roles, show loading state, show success/error toast, update UI without full reload.
- Destructive Actions: Confirm dialogs stating the effect. Delete requires keyword typing.
- Tables: Server-side pagination, debounced search, column sort, filters in URL, row checkboxes, empty state.
- Forms: Inline validation, disabled submit during save, unsaved warnings.

## SHARED PAGES
1. `/login`: Username (regNo/staffID/admin) and password. Auto role detection.
2. `/forgot-password`: Enter ID + reason.
3. `/change-password`: Old/new password, strength meter.
4. `/profile`: Avatar, name, phone, email, notifications, theme, language, sign out all devices.
5. `/notifications`: Unread dot, filters, mark read.
6. `/calendar`: Month/week/agenda views.
7. Global search (Ctrl+K).
8. Help bot widget.
9. Header: Logo, search, language, theme, bell, avatar menu.
10. Error pages: role-aware `not-found.tsx` preserving sidebars.

## ADMIN PORTAL (/admin)
A1. `/admin` (Dashboard): Stat cards, charts, AI status, audit activity, alerts panel, quick actions.
A2. `/admin/students`: Table of students, Add, Bulk Import, row click to profile, bulk actions.
A3. `/admin/teachers`: Table of teachers, Add, Bulk Import, assign departments/HOD.
A4. `/admin/departments`: Tabs for Departments, Subjects, Academic Years, Sections.
A5. `/admin/classrooms`: List classrooms, Create, admin view of classroom tabs.
A6. `/admin/rollout`: Department x Year matrix switch, auto-clears cache.
A7. `/admin/blocked`: Blocked users table, Unblock (admin override).
A8. `/admin/password-requests`: Inbox of reset requests, Approve/Reject.
A9. `/admin/marks`: Marks scheme setup, Finalisation status, Reports, Grade bands.
A10. `/admin/announcements`: Notice board (draft, live, expired), Pin, Delete.
A11. `/admin/exams`: Exam entries, PYQ uploads.
A12. `/admin/mentors`: Mentor groups, risk lists.
A13. `/admin/feedback`: Feedback windows, aggregated results.
A14. `/admin/analytics`: Daily active users, feature usage, AI usage stats.
A15. `/admin/ai`: AI config, fallback, connection test, re-embed, usage log.
A16. `/admin/settings`: General, Security, Uploads, Features, Gamification, Attendance, Exam mode.
A17. `/admin/backups`: Backup list, system health, restore.
A18. `/admin/audit-log`: System-wide audit log table with filters.

## TEACHER PORTAL (/teacher)
B1. /teacher (Dashboard): Class summary, pending grading, doubts, upcoming tests, at-risk students.
B2. /teacher/classrooms: Cards for handled classrooms, Create Classroom.
B3. /teacher/classrooms/[id]:
    - Stream: Posts, comments, announcements.
    - Notes: Upload materials, AI questions/flashcards generation.
    - Assignments: Create, submissions, grading, AI feedback.
    - Quizzes: Question bank, auto-generate.
    - Tests: Live monitor, start/extend, auto-grade.
    - Students: Drill-down marks, attendance, block/unblock.
    - Attendance: Manual, QR live attendance.
    - Marks: Spreadsheet view, finalise, unlock request.
    - Meet: Start, schedule, polls, transcripts.
    - Doubts: Q&A tickets for the class.
    - Analytics: Topic weaknesses, submission rates.
B4. /teacher/class-time: Big buttons for Quick Poll, Pop Quiz, Start Test, QR Attendance, Meet.
B5. /teacher/marks: All subjects summary, distribution charts, grade bands.
B6. /teacher/question-bank: Global question bank across classes.
B7. /teacher/doubts: Global doubts inbox.
B8. /teacher/students: Students list across classrooms.
B9. /teacher/attendance: Summary of attendance across classrooms.
B10. /teacher/mentoring: Mentees list, risk score, nudges, private notes.
B11. /teacher/feedback: Course feedback aggregated ratings.
B12. /teacher/notices: Notice board view and post.
B13. /teacher/timetable: Weekly schedule grid.

## HOD PORTAL (/hod)
C1. /hod (Dashboard): Dept summary, subject average chart, teacher performance, alerts.
C2. /hod/performance: Tables and charts for dept performance, pass %, section vs section.
C3. /hod/teachers: Dept teachers, workload, feedback rating, finalisation status.
C4. /hod/sections: Sections by year with attendance, average, at-risk count.
C5. /hod/at-risk: Ranked list of at-risk students, threshold sliders.
C6. /hod/attendance: Dept attendance by subject/section, low attendance students.
C7. /hod/mentors: Mentor groups and meeting log.
C8. /hod/marks: Marks finalisation status by subject, request unlock.
C9. /hod/feedback: Aggregated feedback per subject and teacher.
C10. /hod/notices: Dept notice board, post/edit/delete own.
C11. /hod/rollout: Read-only rollout view.
C12. /hod/exports: Generate dept reports (Excel/PDF).

## STUDENT PORTAL (/student)
D1. /student (Dashboard): Greeting, streak, deadlines, tests today, live meets, exam countdown, daily challenge, attendance warnings, latest marks, nudges. [COMPLETED]
D2. /student/classrooms: Joined classes, Join with code. [COMPLETED]
D2. /student/classrooms/[id]: Stream, Notes, Assignments, Quizzes, Flashcards, Tests, Doubt Bot, Doubt Wall, Meet, Study Rooms, Leaderboard. [COMPLETED]
D3. /student/assignments: All assignments across classes with filters.
D4. /student/tests: Upcoming, live now, past results. Live test with offline banner, auto-submit. Result page with question review. [COMPLETED]
D5. /student/quizzes: Practice history, new practice quiz, important questions bank. [COMPLETED]
D6. /student/flashcards: Decks, study interface, create deck, mastery %. [COMPLETED]
D7. /student/my-notes: Private notes, share, flashcards gen, ask bot. [COMPLETED]
D8. /student/marks: Component breakdown, class avg, trend chart, rank band, target calculator. [COMPLETED]
D9. /student/attendance: Subject %, calendar heat-map, predictor, QR scan. [COMPLETED]
D10. /student/exam-hub: Countdown, Study Planner, Weak Topics, Mock Exam, PYQs, AI Revision Tools, Last-Night Mode. [COMPLETED]
D11. /student/leaderboard: Class/dept/college, filters, podium, public mini-profile, hide name. [COMPLETED]
D12. /student/profile: Avatar, level/XP, streak, badges, certificates, export skill profile. [COMPLETED]
D13. /student/skill-tracks: Aptitude, dept tracks, leaderboard. [COMPLETED]
D14. /student/study-buddy: Opt-in, suggest buddies, invite to room. [COMPLETED]
D15. /student/notices: Notice board with filters, register for events. [COMPLETED]
D16. /student/feedback: Open forms, submit anonymous feedback. [COMPLETED]
D17. /student/notifications & /student/calendar: Standard shared pages. [COMPLETED]
