# 🎓 SIET LEARNER PLATFORM (Lecture Lens)

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

> **SIET Learner Platform** (codenamed **Lecture Lens**) is an institutional-grade, AI-driven learning management and classroom ecosystem tailored specifically for **Sri Shakthi Institute of Engineering and Technology (SIET)**. 
> It bridges Students, Teachers, Heads of Department (HODs), and Administrators with automated lecture processing, AI-powered doubt resolution, real-time examination engines with zero-loss autosaving, and department-wide analytics.

---

## 📌 Table of Contents

- [1. About The Project](#1-about-the-project)
- [2. System Architecture & Diagrams](#2-system-architecture--diagrams)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Live Examination & Autosave Data Flow](#live-examination--autosave-data-flow)
  - [Dual-Engine AI Routing Pipeline](#dual-engine-ai-routing-pipeline)
- [3. Core Capabilities & Role Portals](#3-core-capabilities--role-portals)
  - [Student Portal](#-student-portal-student)
  - [Teacher Portal](#-teacher-portal-teacher)
  - [HOD Portal](#-hod-portal-hod)
  - [Admin Portal](#-admin-portal-admin)
- [4. Tech Stack Breakdown](#4-tech-stack-breakdown)
- [5. How to Start and What All To Do (Step-by-Step)](#5-how-to-start-and-what-all-to-do-step-by-step)
  - [Step 1: Prerequisites Check](#step-1-prerequisites-check)
  - [Step 2: Clone the Project](#step-2-clone-the-project)
  - [Step 3: Install Dependencies](#step-3-install-dependencies)
  - [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
  - [Step 5: Setup & Migrate Database](#step-5-setup--migrate-database)
  - [Step 6: Seed Default Data](#step-6-seed-default-data)
  - [Step 7: Run Development Server](#step-7-run-development-server)
  - [Step 8: (Optional) Run Background Task Worker](#step-8-optional-run-background-task-worker)
- [6. Running with Docker](#6-running-with-docker)
- [7. Default Demo Credentials](#7-default-demo-credentials)
- [8. Testing & Validation Commands](#8-testing--validation-commands)
- [9. Project Directory Structure](#9-project-directory-structure)
- [10. Troubleshooting & FAQ](#10-troubleshooting--faq)

---

## 1. About The Project

Traditional learning management platforms are static repositories of files. **SIET Learner Platform** transforms static course material into an interactive, high-retention learning experience:

- **AI Note Intelligence**: Uploaded lecture materials (PDFs, PPTs, Word docs) are automatically parsed and converted into bite-sized summaries, study flashcards, and automated multiple-choice quizzes.
- **RAG Doubt Assistant & Tamil AI**: Students can chat with a contextual AI tutor strictly grounded in course notes, supporting both English and Tamil explanations.
- **Resilient Online Exams**: Live class tests run with server-synchronized timers and sub-second answer autosaving. Even if a student accidentally closes the browser or loses internet connectivity, answers remain secure.
- **Stateless High-Concurrency Authentication**: Zero database calls for route permission checks via cryptographically signed JWT cookies (`jose`), with SSE streams for instant push notifications and security lockouts.
- **Institutional Governance**: Real-time early-warning alerts for students at risk of attendance shortage (<75%) or failing internal marks, empowering faculty mentors and HODs to intervene early.

---

## 2. System Architecture & Diagrams

### High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client ["Client Layer (Web / Mobile Browser)"]
        S_UI["Student Portal (/student)"]
        T_UI["Teacher Portal (/teacher)"]
        H_UI["HOD Portal (/hod)"]
        A_UI["Admin Portal (/admin)"]
    end

    subgraph Edge ["Routing & Security (Next.js)"]
        Proxy["Proxy & Edge Guards (src/proxy.ts)"]
        Auth["JWT Cookie Validator (Stateless jose)"]
        RateLimit["In-Memory Rate Limiter & Lockout Map"]
    end

    subgraph ServerApp ["Next.js App Server (Node.js runtime)"]
        AppRouter["Next.js 16 App Router (59+ Role Routes)"]
        SSE["Real-Time SSE Hub (/api/realtime)"]
        APIs["API Routes (/api/student, /api/teacher, /api/tests)"]
    end

    subgraph AIRouter ["AI Orchestration Layer (src/lib/ai)"]
        AIRoute["Provider Router"]
        OllamaLocal["Ollama Local LLM (qwen2.5:7b / nomic-embed)"]
        GeminiCloud["Google Gemini 1.5 Flash (Fallback / Cloud)"]
    end

    subgraph WorkerService ["Background Queue & Workers"]
        BackgroundWorker["Worker Process (worker.ts)"]
        DocParser["Doc Processors (pdf-parse, mammoth, OCR)"]
        FlashcardGen["Quiz & Flashcard Generator"]
    end

    subgraph DataLayer ["Data & Storage Layer"]
        PrismaORM["Prisma ORM Client"]
        PostgresDB[("PostgreSQL Database (Neon / Cloud / Local)")]
        FileStore["File Upload Storage (Local / Cloud)"]
    end

    Client --> Edge
    Edge --> ServerApp
    ServerApp --> AIRouter
    ServerApp --> PrismaORM
    ServerApp --> WorkerService
    WorkerService --> AIRouter
    WorkerService --> PrismaORM
    PrismaORM --> PostgresDB
    AIRoute -->|Primary (Low Latency)| OllamaLocal
    AIRoute -->|Fallback (Offline/Error)| GeminiCloud
    ServerApp -->|Real-time Events| SSE
    SSE -.-> Client
```

---

### Live Examination & Autosave Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Browser as Browser Client
    participant API as /api/tests/autosave
    participant DB as PostgreSQL (Prisma)
    participant Timer as Server-Side Clock

    Student->>Browser: Selects Option / Types Answer
    Browser->>Browser: Update Local State & Debounce (1000ms)
    Browser->>API: POST /api/tests/autosave {testId, questionId, selectedAnswer}
    API->>Timer: Check Test Window & Time Limit
    alt Time Expired
        API-->>Browser: HTTP 403 (Test Session Expired)
        Browser->>Browser: Lock Test & Auto-Submit
    else Time Valid
        API->>DB: Upsert TestSubmissionAnswer
        DB-->>API: Persisted Confirmed
        API-->>Browser: HTTP 200 {savedAt: timestamp}
        Browser->>Student: Display Green "Saved" Indicator
    end
```

---

### Dual-Engine AI Routing Pipeline

```mermaid
flowchart LR
    A[AI Request: Doubt / Quiz / Summary] --> B[AI Router: src/lib/ai/index.ts]
    B --> C{Is Ollama Available?}
    C -->|Yes: Within 30s Timeout| D[Ollama Local Engine]
    D --> E[Generate Embeddings & Answers]
    C -->|No / Timeout / Error| F{Is Gemini Key Configured?}
    F -->|Yes| G[Google Gemini 1.5 Flash]
    F -->|No| H[Deterministic Mock / Graceful Fallback]
    E --> I[Return Response to Client]
    G --> I
    H --> I
```

---

## 3. Core Capabilities & Role Portals

### 🎓 Student Portal (`/student`)
| Feature | Path | Description |
|---|---|---|
| **Classroom Hub** | `/student/classrooms` | View enrolled classes, access stream updates, assignments, and notes. |
| **AI Study Tutor** | `/student/ai-tutor` | Chat with course-context RAG AI in English and Tamil. |
| **Interactive Study**| `/student/study` | Flashcards, automated quizzes, and quick revision briefs. |
| **Live Examinations**| `/student/tests/[id]` | Timed exam portal with real-time countdown and autosaving. |
| **Attendance Tracker**| `/student/attendance` | Dynamic QR check-in and attendance predictor with 75% threshold alerts. |
| **Marks & Analytics**| `/student/marks` | Grade breakdown, historical trendlines, and class leaderboard. |
| **Exam Revision Hub**| `/student/exam-hub` | Last-night revision modules and high-priority topic lists. |

### 👨‍🏫 Teacher Portal (`/teacher`)
| Feature | Path | Description |
|---|---|---|
| **Class Management**| `/teacher/classrooms` | Create classrooms, post announcements, invite students. |
| **AI Studio** | `/teacher/ai-studio` | Upload lecture notes, auto-generate question banks and test papers. |
| **Class Tests** | `/teacher/classroom/[id]`| Schedule live examinations, define passing marks and time limits. |
| **Grading Center** | `/teacher/marks` | Review assignment submissions, grade tests, lock marks. |
| **Attendance & QR** | `/teacher/attendance` | Project dynamic QR codes for in-class attendance capture. |
| **Mentoring Desk** | `/teacher/mentoring` | Maintain private student mentoring logs and behavioral remarks. |

### 🏢 HOD Portal (`/hod`)
| Feature | Path | Description |
|---|---|---|
| **Department Health**| `/hod` | Live analytics on subject pass percentages and faculty progress. |
| **At-Risk Detection** | `/hod/at-risk` | Automatically flags students suffering from low attendance or test failure. |
| **Faculty Oversight** | `/hod/teachers` | Monitor classroom syllabus completion rates and grading timeliness. |
| **Department Reports**| `/hod/exports` | Export departmental marks, internal evaluations, and NAAC/NBA metrics. |

### 🛠 Admin Portal (`/admin`)
| Feature | Path | Description |
|---|---|---|
| **User Directory** | `/admin/students`, `/admin/teachers` | Full user administration (create, edit, block, reset credentials). |
| **Rollout Engine** | `/admin/rollout` | Enable/disable features selectively per academic year (1st to 4th year). |
| **System Metrics** | `/api/metrics` | Real-time monitoring of CPU load, memory usage, active tests, and DB pool. |
| **Security Controls**| `/admin/blocked` | Unblock brute-force locked accounts and manage IP access limits. |

---

## 4. Tech Stack Breakdown

- **Frontend & App Framework**: Next.js 16.4.0 (App Router, Turbopack, React 19)
- **UI Components & Styling**: Tailwind CSS v4, `@radix-ui`, `shadcn/ui`, `lucide-react`
- **Database & Data Access**: PostgreSQL (via Neon or local instance) + Prisma ORM 5.22.0
- **Authentication**: Stateless signed JWT cookies (`jose`), `bcrypt` password hashing
- **Real-Time Push**: Server-Sent Events (SSE) `/api/realtime`
- **Document Processing**: `pdf-parse`, `mammoth` (Word documents), `tesseract.js` (OCR)
- **AI Acceleration**: Local Ollama (`qwen2.5:7b-instruct`) + Google Gemini 1.5 Flash SDK
- **Testing Tools**: Playwright (E2E), k6 (Stress & Concurrency testing)

---

## 5. How to Start and What All To Do (Step-by-Step)

Follow this precise checklist to get the complete platform running locally on your machine.

### Step 1: Prerequisites Check

Ensure you have the following installed:
- **Node.js**: `v20.x` or `v22.x` ([Download Node.js](https://nodejs.org/))
- **Git**: Installed and configured ([Download Git](https://git-scm.com/))
- **PostgreSQL**: Either a local instance, Docker container, or cloud database (such as [Neon.tech](https://neon.tech))
- *(Optional)* **Ollama**: If running offline local AI ([Download Ollama](https://ollama.com/))

Verify versions in terminal:
```bash
node -v    # v20.x or higher
npm -v     # v10.x or higher
git --version
```

---

### Step 2: Clone the Project

```bash
git clone https://github.com/psgktp18-rgb/SIET_LEARNER_PLATFORM.git
cd SIET_LEARNER_PLATFORM
```

---

### Step 3: Install Dependencies

```bash
npm install
```

---

### Step 4: Configure Environment Variables

1. Copy `.env.example` to create your active `.env`:
   ```bash
   # Windows PowerShell:
   Copy-Item .env.example .env

   # Linux / macOS:
   cp .env.example .env
   ```

2. Open `.env` and fill in your connection details:
   ```ini
   # 1. DATABASE: PostgreSQL connection string
   DATABASE_URL="postgresql://username:password@localhost:5432/lecture_lens?schema=public"

   # 2. AUTHENTICATION: Secure JWT secret (at least 32 characters)
   JWT_SECRET="super_secret_jwt_key_at_least_32_characters_long"
   ENCRYPTION_KEY="secret_encryption_key_for_dev_only"

   # 3. BASE URL:
   APP_URL="http://localhost:3000"
   NODE_ENV="development"

   # 4. AI PROVIDERS (Ollama local and/or Google Gemini cloud)
   AI_PRIMARY="ollama"
   AI_FALLBACK="gemini"
   AI_PROVIDER="router"
   OLLAMA_BASE_URL="http://localhost:11434"
   OLLAMA_CHAT_MODEL="qwen2.5:7b-instruct"
   OLLAMA_EMBED_MODEL="nomic-embed-text"

   # Add your Gemini key if using cloud fallback
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   GEMINI_MODEL="gemini-1.5-flash"
   ```

---

### Step 5: Setup & Migrate Database

Push the Prisma database schema to your PostgreSQL database and generate the Prisma Client code:

```bash
# Push schema structure to PostgreSQL
npx prisma db push

# Generate Prisma Client bindings
npx prisma generate
```

*(Tip: You can visually inspect your database records anytime by running `npx prisma studio`)*

---

### Step 6: Seed Default Data

Populate the database with default departments (CSE, ECE, MECH, etc.), classrooms, test subjects, and seeded accounts:

```bash
# Seed initial users, classrooms, and courses
npx tsx prisma/seed.ts

# (Optional) Seed additional academic subjects
node scripts/seed_subjects.js
```

---

### Step 7: Run Development Server

```bash
npm run dev
```

Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser. You will see the SIET Learner Platform login screen!

---

### Step 8: (Optional) Run Background Task Worker

If you are processing large PDFs, generating AI flashcards in the background, or calculating plagiarism:

```bash
npm run worker
```

---

## 6. Running with Docker

To spin up the application along with PostgreSQL and Ollama in containers:

```bash
# Build and run containers in background
docker-compose up --build -d

# View live container logs
docker-compose logs -f app

# Stop containers
docker-compose down
```

---

## 7. Default Demo Credentials

After running `npx tsx prisma/seed.ts`, sign in with any of these pre-configured accounts:

| Role | Username / Identifier | Password | Access Rights |
|---|---|---|---|
| 👑 **Administrator** | `admin` | `admin123` | Institutional Admin & System Management |
| 🏢 **HOD** | `HOD-CSE` | `password123` | Computer Science Department Chair |
| 👨‍🏫 **Teacher** | `T101` | `password123` | Faculty Instructor & Classroom Owner |
| 🎓 **Student** | `714024243219` | `password123` | Undergraduate Student |

> **Security Note**: All default seed accounts except `admin` use password `password123`. Users can change their password anytime via `/change-password`.

---

## 8. Testing & Validation Commands

```bash
# 1. Run Core Integration Tests
npm test

# 2. Run Route Verification Tests (Playwright)
npm run test:routes

# 3. Check Authentication Health
npm run auth:check

# 4. Interactive Reset Admin Password Utility
npm run auth:reset-admin

# 5. Run Concurrency & High Load Tests (Requires k6)
npm run loadtest:login
npm run loadtest:test
npm run loadtest:mixed
```

---

## 9. Project Directory Structure

```text
SIET_LEARNER_PLATFORM/
├── .github/                   # GitHub Actions CI/CD workflows
│   └── workflows/
│       ├── ci.yml             # Type-check, lint, and test validation
│       └── deploy.yml         # Container build and deployment pipeline
├── docs/                      # Architectural specs & technical runbooks
│   ├── SPEC.md                # System specification & feature roadmap
│   ├── RUNBOOK.md             # Operations & live test mitigation runbook
│   └── PAGES.md               # 59+ route catalog
├── prisma/
│   ├── schema.prisma          # Comprehensive PostgreSQL database schema
│   └── seed.ts                # Database seeder script
├── public/                    # Static brand assets, fonts, icons
├── scripts/                   # Administrative and seed utilities
├── src/
│   ├── app/                   # Next.js App Router (59+ Role Routes)
│   │   ├── (auth)/login/      # Single-query high speed JWT login
│   │   ├── admin/             # Admin portal (users, rollout, metrics)
│   │   ├── hod/               # HOD portal (departments, at-risk, analytics)
│   │   ├── teacher/           # Teacher portal (classes, marks, AI studio)
│   │   ├── student/           # Student portal (study, tests, AI tutor)
│   │   └── api/               # API endpoints (Auth, AI, Tests, Realtime)
│   ├── components/            # Reusable UI widgets & layout navigation
│   │   ├── ai/                # AI chat output viewers & status panels
│   │   ├── classroom/         # Stream announcements & health badges
│   │   ├── layout/            # Sidebar, Header, GlobalSearchDialog
│   │   └── ui/                # shadcn primitives (Button, Card, Dialog, Table)
│   ├── lib/                   # Shared backend logic & helper engines
│   │   ├── ai/                # Ollama & Gemini provider routers
│   │   ├── auth/              # JWT verification & cookie helpers
│   │   ├── jobs/              # Async worker task handlers
│   │   ├── test-engine.ts     # Examination autosave & evaluation engine
│   │   └── prisma.ts          # Singleton Prisma client instance
│   └── types/                 # TypeScript typings
├── .env.example               # Environment variable blueprint
├── docker-compose.yml         # Container orchestration
├── Dockerfile                 # Multi-stage production container image
├── package.json               # Node.js dependencies and script aliases
├── tsconfig.json              # TypeScript compilation rules
├── worker.ts                  # Background job queue runner
└── README.md                  # System manual and documentation
```

---

## 10. Troubleshooting & FAQ

### Q1: The login page just refreshes or loops back to `/login` without an error.
- **Answer**: Ensure `JWT_SECRET` in your `.env` is at least 32 characters long. In addition, when testing locally over plain HTTP (`http://localhost:3000` or `http://192.168.x.x:3000`), verify that the `Secure` flag on cookies is not enabled since plain HTTP browsers will reject secure cookies.

### Q2: Prisma returns `P1001: Can't reach database server at localhost:5432`.
- **Answer**: Check if your PostgreSQL service is running (`systemctl status postgresql` or Docker container). If connecting to Neon or Supabase, ensure that your `DATABASE_URL` contains `?sslmode=require`.

### Q3: AI requests return generic mock responses.
- **Answer**: The system uses a fallback hierarchy. If Ollama is not running locally, make sure you have supplied a valid `GEMINI_API_KEY` in your `.env`. You can test your key at [Google AI Studio](https://aistudio.google.com/).

### Q4: How do I unblock a student who entered the wrong password 5 times?
- **Answer**: Accounts unlock automatically after 5 minutes. Alternatively, an Administrator can navigate to `/admin/blocked` and click **"Unblock"** for immediate access.

---

## 📜 Institutional Ownership & Notice

**Sri Shakthi Institute of Engineering and Technology (SIET)**  
Department of Computer Science & Engineering  
Coimbatore, Tamil Nadu, India.  

*All software architecture, schemas, and design patterns within this repository are proprietary assets of SIET.*