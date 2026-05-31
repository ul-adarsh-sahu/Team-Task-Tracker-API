# Team Task Tracker API

A REST API for managing tasks within a team — with authentication, role-based access control, Redis caching, and containerized deployment.

Built with **Node.js + Express**, **MongoDB**, and **Redis**.

---

## Quick Start

```bash
docker compose up
```

That's it. The API will be available at `http://localhost:3000`.

> No `.env` file needed — `docker-compose.yml` ships with all defaults for local development.

---

## API Base URL

```
http://localhost:3000/api/v1
```

Swagger docs available at: `http://localhost:3000/api-docs`

---

## Roles & Permissions

| Action | ADMIN | MANAGER | MEMBER |
|---|---|---|---|
| Manage users (invite, change role, delete) | ✅ | ❌ | ❌ |
| Create / delete projects | ✅ | ✅ | ❌ |
| Create / delete tasks | ✅ | ✅ | ❌ |
| Assign tasks to members | ✅ | ✅ | ❌ |
| View all tasks in org | ✅ | ✅ | ❌ |
| View & update own assigned tasks | ✅ | ✅ | ✅ |
| Change task status | assignee / MANAGER / ADMIN | assignee / MANAGER | own tasks only |

RBAC is enforced entirely at the **middleware level** — controllers contain zero role-check logic.

---

## Task Status Transitions

Status changes are server-enforced. Free-form updates are rejected.

```
TODO → IN_PROGRESS → IN_REVIEW → DONE
  ↘         ↘            ↘
        BLOCKED  (reachable from any active state)
           ↓
       IN_PROGRESS  (re-open a blocked task)
```

---

## Caching Strategy

Redis is used to cache task list results **per assignee**.

**Cache key format:**
```
tasks:assignee:{assigneeId}:page{n}:limit{n}:status{s}:priority{p}
```

**TTL:** 5 minutes (configurable via env)

**Invalidation triggers:**
- A task assigned to a user is created → invalidate that assignee's cache
- A task is updated (title, priority, due_date, assignee) → invalidate old assignee AND new assignee cache
- A task's status changes → invalidate the assignee's cache
- A task is deleted → invalidate the assignee's cache

Pattern-based deletion (`tasks:assignee:{id}:*`) is used so all pagination/filter variants are cleared at once. This avoids stale data across different query combinations.

---

## Database Design

### Schema Overview

```
Organization
  └── Users (many) — each user belongs to one org, has one role
  └── Projects (many) — scoped to an org
       └── Tasks (many) — scoped to a project + org

Task
  - assigneeId  → ref User
  - projectId   → ref Project
  - organizationId → ref Organization  (denormalized for query performance)
  - status, priority, due_date, completedAt
```

### Key Design Decision: Denormalized `organizationId` on Task

Tasks already belong to a Project which belongs to an Organization. However, `organizationId` is stored directly on the Task document as well.

**Why:** Every task query in this system is org-scoped (users can only see tasks in their org). Without the denormalized field, every query would require a `$lookup` join through Project → Organization. By storing `organizationId` on Task directly, queries stay as simple single-collection finds with compound index support:

```js
taskSchema.index({ organizationId: 1, status: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ due_date: 1 });
```

**Tradeoff:** If a project is moved to another org (rare), a migration is needed. Acceptable for this domain.

---

## Project Structure

```
src/
  api/
    auth/         → register, login, refresh, logout
    user/         → user management (ADMIN only)
    project/      → project CRUD
    task/         → task CRUD + status transitions
    analytics/    → overdue stats + avg completion time (bonus)
  config/
    db.js         → MongoDB connection
  middlewares/
    checkToken.js → JWT verify + RBAC (role enforcement lives here)
  models/         → Mongoose schemas
  utility/
    constants.js  → ROLES, TASK_STATUS, STATUS_TRANSITIONS
    redis.js      → cacheGet / cacheSet / cacheDelPattern
    responses.js  → consistent { status, code, message, data } shape
tests/
  unit/           → auth flows + task transition logic
```

---

## Environment Variables

Copy `.env.example` to `.env` for local non-Docker development:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/task_tracker
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change_in_production
JWT_REFRESH_SECRET=change_in_production
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

---

## Running Tests

```bash
npm test
```

---

## What I Would Improve Given More Time

- **WebSocket notifications** — real-time push when an assigned task changes status (Socket.io or SSE)
- **Refresh token family tracking** — detect and block refresh token reuse attacks
- **Soft deletes** — mark tasks/users as deleted instead of hard-removing, for audit trails
- **Rate limiting** — per-user rate limiting on auth endpoints to prevent brute force
- **Task activity log** — append-only history of every status change (who changed it, when)
- **Integration tests** — full request → DB flow using supertest + mongo-memory-server
- **CI/CD pipeline** — GitHub Actions: lint → test → build Docker image on every PR
