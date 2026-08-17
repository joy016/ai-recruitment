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
