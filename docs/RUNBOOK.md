# Lecture Lens - Admin Runbook

This runbook provides operational instructions for managing Lecture Lens during high-traffic events, such as Live Class Tests.

## Pre-Flight Checks (Before a Live Test)
1. **System Health Check**:
   - Navigate to `/api/metrics` as Admin to verify the system is `healthy`.
   - Ensure CPU load average is below 1.5 per core.
   - Ensure the `userCount` matches expectations and the DB pool is responsive.
2. **AI Provider Status**:
   - Verify `SystemSettings` to ensure `aiPrimaryProvider` is responsive. If Ollama is slow on the host machine, flip the toggle to `gemini` or disable `aiMasterSwitch` entirely during the exam to conserve CPU.
3. **Rollout Settings**:
   - Ensure the correct `enabledYears` array is set. For instance, if a 3rd-year test is happening, ensure `[3]` is enabled.

## Monitoring During the Test
- Check `/api/metrics` to monitor the `activeTestCount` and memory footprint.
- Monitor the container via `docker stats` (if running in Docker) to ensure the `postgres` container is not hitting its 2GB reservation limit.

## Emergency Mitigation
- **Login Issues / IP Blocking**:
  - The system is configured to rate limit by student `regNo`. If a student is blocked, their individual account requires 5 minutes to reset. The rest of the class IP remains unaffected.
- **Database Connection Pool Exhaustion**:
  - If the database refuses connections, it implies the 200 connection limit is breached. Do not restart the server immediately. The clients are designed to apply exponential back-off and jitter. Wait 30 seconds for the herd to clear.
- **System Crash / Recovery**:
  - If the Node process crashes, restart it via PM2 or Docker. 
  - *Student Data is Safe*: All test answers are aggressively autosaved. Students can refresh the page and resume the exam with accurate time remaining (derived securely from the server clock).

## Load Testing Commands
To practice high-load scenarios using the dedicated mock database:
1. Ensure the `.env` points `DATABASE_URL` to the `lecture_lens_loadtest` database.
2. Spin up the DB: `docker-compose -f docker-compose.loadtest.yml up -d`
3. Seed the test users: `npm run loadtest:seed`
4. Run the k6 storms: `npm run loadtest:login` or `npm run loadtest:mixed`
5. Cleanup after testing: `npm run loadtest:clean`
