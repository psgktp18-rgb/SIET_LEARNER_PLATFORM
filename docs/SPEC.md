# Lecture Lens - Platform Specification and Roadmap

## VISION
Teachers create classrooms, upload notes, give assignments, and run class tests. Students submit work, study notes, use flashcards, take auto-generated quizzes, join live meets, and chat with an AI that answers doubts from the uploaded notes. Admin manages everything.

## Roadmap

### Phase 1 (Foundation & Core) - COMPLETED
- Foundation, authentication, role-based access control
- Admin panel (manage users, departments, classrooms, system settings)
- Classrooms setup
- Dashboard skeletons for Student and Teacher
- Phase 1B: Department seeding, Year-based rollout, Teacher student blocking, Admin overrides

### Phase 2 (Notes & AI Engine)
- Notes uploading and management
- AI engine integration (Ollama primary, Gemini backup)
- Auto-generated quizzes from notes
- Flashcards generation

### Phase 3 (Assignments & Testing)
- Assignments and submissions
- Class tests
- RAG chatbots for uploaded notes
- Doubt tickets

### Phase 4 (Live & Analytics) - COMPLETED
- Live meet integration
- Leaderboard and gamification
- Exam preparation tools
- Analytics dashboards
- Security hardening
- Phase 4B: Marks and performance tracking, HOD views, Admin performance reports
- Phase 4C: Tamil AI, Attendance Predictor, Early Warning System, Skill Tracks, Study Buddy, Last-Night Revision, Notice Board, Course Feedback, QR Attendance
- Phase 4D: Load Testing, Chaos Engineering, Observability (/api/metrics), Connection Pooling, and Rate Limiting hardening.

### Phase 5 (DevOps)
- CI/CD with GitHub Actions
- Dockerization for deployment

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM (SQLite local, PostgreSQL prod)
- Auth: Custom credentials login, JWT in httpOnly cookies, bcrypt

## Authentication (V2 Redesign)
- Replaced database-backed session verifications with stateless JWT signed cookies via `jose`.
- **Zero DB Hits** for authenticated routes. Role and user details are securely extracted directly from the signed payload.
- Real-time Node SSE server stream handles bell notifications, test pushes, and immediate force logouts.
- 5-minute login lockouts for brute-force prevention are handled via an in-memory Map.


## Route Map
- /admin: Dashboard
- /admin/students: Manage Students
- /admin/teachers: Manage Teachers
- /admin/settings: System Settings
- /admin/rollout: Rollout Settings
- /admin/blocked: Blocked Users
- /admin/reports: Marks & Reports
- /teacher: Dashboard
- /teacher/classroom/[classroomId]: Classroom tabs (stream, notes, assignments, quizzes, tests, students, meet, marks)
- /teacher/students: My Students
- /student: Dashboard
- /student/classroom/[classroomId]: Classroom tabs (stream, notes, assignments, quizzes, tests, flashcards, meet)
- /student/marks: My Marks
- /hod: HOD Dashboard
