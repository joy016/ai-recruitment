# AI Recruitment Hub — Backend

Backend API for my **AI Recruitment Hub** project.

This project is also a learning project where I am practicing **C# and ASP.NET Core Web API** while building a real-world recruitment application.

## 🚀 Project Overview

The AI Recruitment Hub is a recruitment management system designed to help manage candidates throughout the hiring process.

The backend provides APIs for:

* Candidate applications
* Application status management
* AI screening results
* Recruitment workflow
* Interview management
* Candidate information
* Database operations

## 🛠️ Tech Stack

* **C#**
* **ASP.NET Core Web API**
* **Entity Framework Core**
* **PostgreSQL**
* **Swagger / OpenAPI**
* **Git & GitHub**

## 📚 Learning Goals

Through this project, I am learning and practicing:

* Building REST APIs with ASP.NET Core
* C# fundamentals
* Controllers and routing
* Dependency Injection
* Entity Framework Core
* PostgreSQL database integration
* CRUD operations
* DTOs
* Model validation
* API error handling
* Swagger / OpenAPI
* Authentication and authorization
* Clean and maintainable backend architecture

## ✨ Current Features

### Candidate Management

* Create candidate applications
* Retrieve candidate information
* Update candidate information
* Manage application status

### Application Status

Current recruitment statuses:

* AI Screening Passed
* Initial Interview
* Technical Interview
* Final Interview
* Job Offer
* Requirements Gathering
* Background Check
* Onboarding
* Offered
* Rejected

### API Documentation

Swagger is available during development to view and test the API endpoints.

## 📁 Project Structure

```text
AI-Recruitment/
│
├── backend/
│   └── ai-recruitment/
│       ├── Controllers/
│       ├── Models/
│       ├── DTOs/
│       ├── Data/
│       ├── Services/
│       ├── Migrations/
│       ├── Program.cs
│       └── appsettings.json
│
└── frontend/
```

> The structure may change as the project grows.

## 🗄️ Database

The project uses **PostgreSQL** as the database.

Entity Framework Core is used to communicate with PostgreSQL.

### Main entities

Currently planned entities include:

* Candidates
* Applications
* Application Statuses
* Interviews
* Screening Results

## ▶️ Running the Project Locally

### 1. Clone the repository

```bash
git clone <your-repository-url>
```

### 2. Navigate to the backend

```bash
cd backend/ai-recruitment
```

### 3. Configure the database

Update the PostgreSQL connection string in your development configuration.

Example:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=ai_recruitment;Username=postgres;Password=your_password"
  }
}
```

> Do not commit real passwords or secrets to GitHub.

### 4. Apply database migrations

```bash
dotnet ef database update
```

### 5. Run the API

```bash
dotnet run
```

The API will run locally using the configured ASP.NET Core URLs.

## 📖 Swagger

When running the application in development mode, Swagger can be used to view and test the available API endpoints.

Example:

```text
http://localhost:<port>/swagger
```

## 🔄 Development Workflow

The general application flow is:

```text
Candidate submits application
            ↓
      Save candidate
            ↓
       AI Screening
            ↓
   Screening Result
       ↓       ↓
     Pass     Fail
       ↓
Recruitment Process
       ↓
   Interviews
       ↓
    Job Offer
       ↓
    Onboarding
```

## 📧 HR Inbox Module

A plain email feature (Features/Inbox) that never creates, updates, or deletes Candidate
data - Candidate data is read-only here, used only to show a sender/recipient card and an
auto-applied label. Email is actually sent/received through n8n's Gmail node; the frontend
never calls n8n directly.

### Setup

1. In Supabase Storage, create a private bucket named `email-attachments` (same way `resume`
   was created) - this app never creates buckets itself.
2. Set the env vars below (see `.env.example`).
3. Import `n8n/send-email.workflow.json` and `n8n/receive-email.workflow.json` into n8n,
   attach a Gmail OAuth2 credential and a Header Auth credential (checking `x-webhook-secret`
   against `N8N_SHARED_SECRET`) to the relevant nodes, and set `APP_BASE_URL` /
   `N8N_SHARED_SECRET` as n8n environment variables too (Receive Email's HTTP Request node
   reads them from there).
4. Start the backend - the 4 default email templates are seeded automatically on startup
   (insert-only by `key`, so re-running never duplicates or overwrites a template you've
   since edited).

### Environment variables

| Variable | Purpose |
| --- | --- |
| `N8N_SEND_EMAIL_WEBHOOK_URL` | Where outbound sends are POSTed. Use the `/webhook-test/...` path while the "Send Email" workflow is open in the n8n editor; **switch to the `/webhook/...` path once the workflow is saved and Active** - the test path only responds while the editor has it open. |
| `N8N_SHARED_SECRET` | Sent as `x-webhook-secret` outbound, and required on both inbound callbacks. Generate with e.g. `openssl rand -base64 32`. |
| `APP_BASE_URL` | This backend's base URL, reachable from n8n - used to build the `callbackUrl` sent to n8n. **If n8n runs in Docker, this must use `host.docker.internal`**, not `localhost`. |
| `ANTHROPIC_API_KEY` | Optional. Without it, the AI "write"/"suggest reply" endpoints fall back to deterministic templated text instead of calling Claude. |

### Endpoints

All require a Bearer JWT and the `inbox.view` permission (reads) or `inbox.send` permission
(sends/mutations) - seeded for the Super Admin and HR Admin roles. Template management
(`POST`/`PATCH`/`DELETE /api/email-templates`) additionally requires `inbox.manageTemplates`
(Super Admin only). Errors are always `{ "error": { "code", "message" } }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/email-templates` | Active templates for the "Use Template" dropdown |
| GET | `/api/email-templates/{key}` | One template |
| POST | `/api/email-templates/{key}/render` | Renders `{{var\|fallback}}` placeholders for a recipient |
| POST / PATCH / DELETE | `/api/email-templates[/{id}]` | Admin template CRUD (soft delete) |
| GET | `/api/inbox/messages` | Threaded conversation list (folder/search/filter/label/sort/page) |
| GET | `/api/inbox/counts` | Per-folder and per-label counts for sidebar badges |
| GET | `/api/inbox/threads/{threadId}` | Full conversation + read-only candidate card |
| PATCH | `/api/inbox/messages/{id}` | Flip isRead/isStarred/isArchived/isDeleted/labels |
| PATCH | `/api/inbox/messages/bulk` | Same, for many ids at once |
| DELETE | `/api/inbox/messages/{id}/permanent` | Only from Trash |
| POST / PUT / DELETE | `/api/inbox/drafts[/{id}]` | Create/autosave/discard a draft |
| POST | `/api/inbox/attachments` | Multipart upload (20 MB total/email, executables blocked) |
| POST | `/api/inbox/send` | Compose/reply/reply-all/forward. Supports an `Idempotency-Key` header |
| POST | `/api/inbox/messages/{id}/retry` | Re-queue a Failed send |
| POST | `/api/inbox/ai/write`, `/api/inbox/ai/suggest-reply` | AI drafting - returns text only, never sends |
| GET | `/api/inbox/events` | SSE stream: `message.received`, `message.sent`, `message.failed`, `counts.updated` |
| POST | `/api/webhooks/n8n/send-result`, `/api/webhooks/n8n/inbound-email` | n8n → backend callbacks (shared-secret auth, not JWT) |

### Example requests

```bash
# List active templates
curl http://localhost:5140/api/email-templates -H "Authorization: Bearer $TOKEN"

# Render a template for a recipient
curl -X POST http://localhost:5140/api/email-templates/interview_invitation/render \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"recipientName":"Maria Santos"}'

# Send a new email
curl -X POST http://localhost:5140/api/inbox/send \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"mode":"new","to":["candidate@example.com"],"subject":"Hello","bodyHtml":"<p>Hi there</p>"}'
```

## 🔮 Future Improvements

Planned improvements include:

* [ ] Authentication and authorization
* [ ] Candidate file/resume upload
* [ ] AI-powered resume screening
* [ ] Interview scheduling
* [ ] Email notifications
* [ ] Recruitment dashboard APIs
* [ ] Recruiter management
* [ ] Audit/history tracking
* [ ] Unit and integration tests
* [ ] Production deployment

## 👩‍💻 About This Project

This is a personal project created to learn and practice backend development using **C#, ASP.NET Core Web API, Entity Framework Core, and PostgreSQL** while building an AI-powered recruitment system.
