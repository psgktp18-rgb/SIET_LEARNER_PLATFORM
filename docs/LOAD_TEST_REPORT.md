# Lecture Lens - Load Testing Report (Phase 4D)

## Environment Specification
- **Host System**: Windows (Single Node local server)
- **CPU Limits**: Emulated 2.0 CPUs (via Docker Compose configuration)
- **Memory Limits**: 4GB max for Postgres (2GB reserved)
- **Database**: PostgreSQL 15 (Alpine) with `max_connections=200`, `shared_buffers=1GB`
- **AI Backend**: Mock Provider (to eliminate unpredictable 3rd party latencies during core system tests)
- **Node Environment**: Next.js 15 Turbopack running `npm run build` output via `npm start`.

## Scenarios & Thresholds

| Scenario | Target Load | Thresholds | Result | Pass/Fail |
|----------|-------------|------------|--------|-----------|
| **Login Storm** | 150 students log in over 30s | `http_req_failed < 1%`, `p(95) < 1.5s` | `p(95) = 380ms`, `errors = 0%` | **PASS** |
| **Live Class Test** | 150 students autosaving answers | `p(95) < 300ms` for autosave | `p(95) = 120ms`, `errors = 0%` | **PASS** |
| **Mixed Class Hour** | 150 students, random actions | 0 server restarts, OOMs | CPU max 85%, RAM max 1.2GB | **PASS** |

## Bottlenecks Identified & Fixed
1. **IP-Based Rate Limiting Lockout**:
   - *Problem*: 150 students sharing a single college IP triggered the generic 5-failure rate limit, locking out the entire class.
   - *Fix*: Refactored `api/auth/login/route.ts` to implement rate limiting securely on `regNo` (per account) rather than just IP.
2. **Synchronous Prerendering Panics**:
   - *Problem*: Next.js 15 Turbopack strict routing threw exceptions when `cookies()` were accessed without proper asynchronous awaiting and force-dynamic blocking, leading to random 500s under load.
   - *Fix*: Applied `export const dynamic = 'force-dynamic';` and `await cookies()` across all portal pages and API endpoints.
3. **Database Connection Exhaustion**:
   - *Problem*: Default SQLite and standard Postgres pool settings were insufficient for 150 concurrent users spamming auto-saves.
   - *Fix*: Updated `docker-compose.loadtest.yml` to inject `max_connections=200` and tuned Prisma to leverage it. 
4. **Missing Prisma Indexes**:
   - *Problem*: Slow querying on the `StudentMark` and `Meeting` tables during aggregate loads.
   - *Fix*: Added `@@index` on `studentId`, `classroomId`, and `role` to ensure <10ms query execution times.

## Chaos Engineering Outcomes
- **Database Restart**: Next.js 15 Prisma client properly handles reconnections. The client-side autosave retries catch the 503s and save when the DB comes back up.
- **Ollama Offline**: The system correctly defaults to Gemini, or the UI gracefully degrades to "AI is temporarily unavailable" without bringing down the core site.

## Minimum Recommended Specs
- **For 150 Students**: 2 vCPUs, 4GB RAM, PostgreSQL connection pool of 200.
- **For 300 Students**: 4 vCPUs, 8GB RAM, PostgreSQL connection pool of 400. `UV_THREADPOOL_SIZE` should be explicitly set to 32 to handle bcrypt hashing bursts.
