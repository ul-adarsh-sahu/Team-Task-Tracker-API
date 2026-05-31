const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Team Task Tracker API",
      version: "1.0.0",
      description:
        "REST API for managing teams, projects and tasks with JWT auth, RBAC, Redis caching and enforced status transitions.",
      contact: { name: "Team Task Tracker" },
    },
    servers: [{ url: "/api/v1", description: "Current server" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Access token obtained from /auth/login or /auth/register",
        },
      },
      schemas: {
        // ── Common ─────────────────────────────────────────────────────────
        Error: {
          type: "object",
          properties: {
            status:  { type: "integer", example: 400 },
            code:    { type: "string",  example: "BAD_REQUEST" },
            message: { type: "string",  example: "Validation failed" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page:       { type: "integer", example: 1 },
            limit:      { type: "integer", example: 10 },
            total:      { type: "integer", example: 42 },
            totalPages: { type: "integer", example: 5 },
          },
        },
        // ── Auth ───────────────────────────────────────────────────────────
        RegisterBody: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name:     { type: "string", example: "Alice" },
            email:    { type: "string", format: "email", example: "alice@example.com" },
            password: { type: "string", minLength: 6, example: "secret123" },
            orgName:  { type: "string", example: "Acme Corp", description: "Provide orgName OR orgId" },
            orgId:    { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d", description: "Provide orgName OR orgId" },
          },
        },
        LoginBody: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email:    { type: "string", format: "email", example: "alice@example.com" },
            password: { type: "string", example: "secret123" },
          },
        },
        AuthTokens: {
          type: "object",
          properties: {
            accessToken:  { type: "string" },
            refreshToken: { type: "string" },
          },
        },
        // ── User ───────────────────────────────────────────────────────────
        User: {
          type: "object",
          properties: {
            _id:            { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            name:           { type: "string", example: "Alice" },
            email:          { type: "string", example: "alice@example.com" },
            role:           { type: "string", enum: ["ADMIN", "MANAGER", "MEMBER"] },
            organizationId: { type: "string" },
            createdAt:      { type: "string", format: "date-time" },
          },
        },
        UpdateRoleBody: {
          type: "object",
          required: ["role"],
          properties: {
            role: { type: "string", enum: ["ADMIN", "MANAGER", "MEMBER"] },
          },
        },
        // ── Project ────────────────────────────────────────────────────────
        Project: {
          type: "object",
          properties: {
            _id:            { type: "string" },
            name:           { type: "string", example: "Website Redesign" },
            description:    { type: "string" },
            organizationId: { type: "string" },
            createdBy:      { type: "string" },
            createdAt:      { type: "string", format: "date-time" },
          },
        },
        ProjectBody: {
          type: "object",
          required: ["name"],
          properties: {
            name:        { type: "string", example: "Website Redesign" },
            description: { type: "string", example: "Redesign the company website" },
          },
        },
        // ── Task ───────────────────────────────────────────────────────────
        Task: {
          type: "object",
          properties: {
            _id:            { type: "string" },
            title:          { type: "string" },
            description:    { type: "string" },
            priority:       { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            status:         { type: "string", enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] },
            assigneeId:     { "$ref": "#/components/schemas/User" },
            projectId:      { type: "string" },
            organizationId: { type: "string" },
            due_date:       { type: "string", format: "date-time" },
            completedAt:    { type: "string", format: "date-time" },
            createdBy:      { "$ref": "#/components/schemas/User" },
            createdAt:      { type: "string", format: "date-time" },
          },
        },
        CreateTaskBody: {
          type: "object",
          required: ["title", "projectId"],
          properties: {
            title:       { type: "string", example: "Implement login page" },
            description: { type: "string", example: "Build the login UI with JWT" },
            priority:    { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
            assigneeId:  { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d", nullable: true },
            projectId:   { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0e" },
            due_date:    { type: "string", format: "date-time", nullable: true },
          },
        },
        UpdateTaskBody: {
          type: "object",
          minProperties: 1,
          properties: {
            title:       { type: "string" },
            description: { type: "string" },
            priority:    { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            assigneeId:  { type: "string", nullable: true },
            due_date:    { type: "string", format: "date-time", nullable: true },
          },
        },
        UpdateStatusBody: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"],
              description: "Enforced transitions: TODO→IN_PROGRESS|BLOCKED, IN_PROGRESS→IN_REVIEW|BLOCKED, IN_REVIEW→DONE|BLOCKED, BLOCKED→IN_PROGRESS",
            },
          },
        },
      },
    },

    paths: {
      // ── AUTH ───────────────────────────────────────────────────────────────
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          description: "Provide `orgName` to create a new organisation (you become ADMIN) **or** `orgId` to join an existing one as MEMBER. Exactly one is required.",
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RegisterBody" } } } },
          responses: {
            201: {
              description: "Registered successfully",
              content: { "application/json": { schema: {
                type: "object",
                properties: {
                  status: { type: "integer", example: 201 },
                  code: { type: "string", example: "CREATED" },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      user: { "$ref": "#/components/schemas/User" },
                      organization: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } },
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                    },
                  },
                },
              } } },
            },
            400: { description: "Validation error", content: { "application/json": { schema: { "$ref": "#/components/schemas/Error" } } } },
            409: { description: "Email already registered" },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/LoginBody" } } } },
          responses: {
            200: {
              description: "Login successful",
              content: { "application/json": { schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      user: { "$ref": "#/components/schemas/User" },
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                    },
                  },
                },
              } } },
            },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Rotate refresh token",
          description: "Exchange a valid refresh token for a new access + refresh token pair (rotation).",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } } } },
          },
          responses: {
            200: { description: "Tokens rotated", content: { "application/json": { schema: { type: "object", properties: { data: { "$ref": "#/components/schemas/AuthTokens" } } } } } },
            401: { description: "Invalid or revoked refresh token" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout",
          description: "Invalidates the stored refresh token server-side.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Logged out" },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ── USERS ──────────────────────────────────────────────────────────────
      "/users": {
        get: {
          tags: ["Users"],
          summary: "List all users in the organisation",
          description: "**ADMIN only**",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "User list", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { "$ref": "#/components/schemas/User" } } } } } } },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
          },
        },
      },
      "/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get a user by ID",
          description: "**ADMIN only**",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "User found" },
            404: { description: "Not found" },
          },
        },
        delete: {
          tags: ["Users"],
          summary: "Delete a user",
          description: "**ADMIN only**",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "User deleted" },
            404: { description: "Not found" },
          },
        },
      },
      "/users/{id}/role": {
        patch: {
          tags: ["Users"],
          summary: "Update a user's role",
          description: "**ADMIN only**",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/UpdateRoleBody" } } } },
          responses: {
            200: { description: "Role updated" },
            400: { description: "Validation error" },
            404: { description: "User not found" },
          },
        },
      },

      // ── PROJECTS ───────────────────────────────────────────────────────────
      "/projects": {
        post: {
          tags: ["Projects"],
          summary: "Create a project",
          description: "**ADMIN, MANAGER**",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/ProjectBody" } } } },
          responses: {
            201: { description: "Project created", content: { "application/json": { schema: { type: "object", properties: { data: { "$ref": "#/components/schemas/Project" } } } } } },
            400: { description: "Validation error" },
          },
        },
        get: {
          tags: ["Projects"],
          summary: "List all projects",
          description: "**All roles**",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Project list", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { "$ref": "#/components/schemas/Project" } } } } } } },
          },
        },
      },
      "/projects/{id}": {
        get: {
          tags: ["Projects"],
          summary: "Get project by ID",
          description: "**All roles**",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Project found" },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Projects"],
          summary: "Update a project",
          description: "**ADMIN, MANAGER**",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/ProjectBody" } } } },
          responses: {
            200: { description: "Updated" },
            404: { description: "Not found" },
          },
        },
        delete: {
          tags: ["Projects"],
          summary: "Delete a project",
          description: "**ADMIN, MANAGER**",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Deleted" },
            404: { description: "Not found" },
          },
        },
      },

      // ── TASKS ──────────────────────────────────────────────────────────────
      "/tasks": {
        post: {
          tags: ["Tasks"],
          summary: "Create a task",
          description: "**ADMIN, MANAGER** — assigneeId must belong to the same organisation.",
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/CreateTaskBody" } } } },
          responses: {
            201: { description: "Task created", content: { "application/json": { schema: { type: "object", properties: { data: { "$ref": "#/components/schemas/Task" } } } } } },
            400: { description: "Validation error / assignee not in org" },
          },
        },
        get: {
          tags: ["Tasks"],
          summary: "List tasks",
          description: "**All roles** — MEMBERs only see tasks assigned to them regardless of filters.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "page",       in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit",      in: "query", schema: { type: "integer", default: 10, maximum: 100 } },
            { name: "status",     in: "query", schema: { type: "string",  enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] } },
            { name: "priority",   in: "query", schema: { type: "string",  enum: ["LOW", "MEDIUM", "HIGH"] } },
            { name: "assigneeId", in: "query", schema: { type: "string" }, description: "Ignored for MEMBER role" },
            { name: "projectId",  in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: {
              description: "Task list with pagination",
              content: { "application/json": { schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      tasks: { type: "array", items: { "$ref": "#/components/schemas/Task" } },
                      pagination: { "$ref": "#/components/schemas/Pagination" },
                    },
                  },
                },
              } } },
            },
          },
        },
      },
      "/tasks/{id}": {
        get: {
          tags: ["Tasks"],
          summary: "Get task by ID",
          description: "**All roles** — MEMBER blocked if not the assignee.",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Task found" },
            403: { description: "MEMBER not assignee" },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Tasks"],
          summary: "Update task fields",
          description: "**All roles** — MEMBER restricted to own tasks; cannot change assigneeId/projectId.",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/UpdateTaskBody" } } } },
          responses: {
            200: { description: "Updated" },
            400: { description: "Validation error" },
            403: { description: "Forbidden" },
            404: { description: "Not found" },
          },
        },
        delete: {
          tags: ["Tasks"],
          summary: "Delete a task",
          description: "**ADMIN, MANAGER**",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "Deleted" },
            404: { description: "Not found" },
          },
        },
      },
      "/tasks/{id}/status": {
        patch: {
          tags: ["Tasks"],
          summary: "Update task status",
          description: "**All roles** — only the assignee or ADMIN/MANAGER can change status. Enforced transitions:\n\n- `TODO` → `IN_PROGRESS`, `BLOCKED`\n- `IN_PROGRESS` → `IN_REVIEW`, `BLOCKED`\n- `IN_REVIEW` → `DONE`, `BLOCKED`\n- `DONE` → *(terminal)*\n- `BLOCKED` → `IN_PROGRESS`",
          security: [{ BearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/UpdateStatusBody" } } } },
          responses: {
            200: { description: "Status updated" },
            400: { description: "Invalid status transition", content: { "application/json": { schema: { type: "object", properties: { code: { type: "string", example: "INVALID_TRANSITION" }, message: { type: "string" } } } } } },
            403: { description: "Not assignee or privileged role" },
            404: { description: "Task not found" },
          },
        },
      },

      // ── ANALYTICS ──────────────────────────────────────────────────────────
      "/analytics/overdue": {
        get: {
          tags: ["Analytics"],
          summary: "Overdue tasks grouped by assignee",
          description: "**ADMIN, MANAGER** — returns all tasks whose `due_date` has passed and status is not DONE, grouped by assignee with counts.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "Overdue task list",
              content: { "application/json": { schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      totalOverdue: { type: "integer", example: 7 },
                      byAssignee: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            assignee: { "$ref": "#/components/schemas/User" },
                            overdueCount: { type: "integer" },
                            tasks: { type: "array", items: { "$ref": "#/components/schemas/Task" } },
                          },
                        },
                      },
                    },
                  },
                },
              } } },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
          },
        },
      },
      "/analytics/summary": {
        get: {
          tags: ["Analytics"],
          summary: "Org-wide task statistics",
          description: "**ADMIN, MANAGER** — task counts by status, completed task count, and average completion time in hours (from `createdAt` to `completedAt`).",
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: "Summary statistics",
              content: { "application/json": { schema: {
                type: "object",
                properties: {
                  data: {
                    type: "object",
                    properties: {
                      tasksByStatus: {
                        type: "object",
                        example: { "TODO": 5, "IN_PROGRESS": 3, "IN_REVIEW": 1, "DONE": 12, "BLOCKED": 2 },
                      },
                      completedTasks: { type: "integer", example: 12 },
                      avgCompletionTimeHours: { type: "number", example: 18.5, nullable: true },
                    },
                  },
                },
              } } },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
          },
        },
      },
    },
  },
  apis: [], // paths defined inline above
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
