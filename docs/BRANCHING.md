# Branching Strategy & Code Review

## Branching Model
Lecture Lens follows a simplified GitHub Flow model:
- `main`: The production branch. Always deployable. Protected by branch rules.
- `feature/*`: For new features (e.g., `feature/live-meet`).
- `bugfix/*`: For fixing issues (e.g., `bugfix/login-timeout`).

## Workflow
1. Create a branch from `main`.
2. Commit your changes (ensure no secrets are committed).
3. Push to GitHub and open a Pull Request against `main`.
4. CI will automatically run lint, tests, migrations check, build, and security scans.
5. Address any failing checks.
6. A Code Owner must review and approve the PR.
7. Squash and merge into `main`.
8. The CD workflow will automatically deploy to the SIET server.

## Branch Protection Rules (Required on GitHub)
- Require pull request reviews before merging (1 approving review minimum).
- Require status checks to pass before merging (lint, test, build, security, e2e).
- Do not allow bypassing the above settings.
