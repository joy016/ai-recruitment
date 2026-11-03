using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.JobPosts.Model;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Data
{
    // Dev-only sample data so the "Recruitment Analytics" dashboard charts have something to
    // show locally. Never runs on its own - invoked via `dotnet run -- seed-dashboard-data`
    // (see Program.cs). Idempotent: skips entirely if any Job already exists, so re-running it
    // never duplicates rows.
    public static class DevDataSeeder
    {
        private static readonly (string Title, string Department)[] JobsToSeed =
        [
            ("Frontend Developer", "Engineering"),
            ("Backend Developer", "Engineering"),
            ("QA Engineer", "Engineering"),
            ("UI/UX Designer", "Design"),
            ("Product Analyst", "Product"),
            ("HR Associate", "Human Resources"),
        ];

        // Includes one unrecognized value ("Indeed") so the Applicants by Source chart's
        // "Other" bucket is populated too.
        private static readonly string[] Sources = ["LinkedIn", "Referral", "Company Website", "JobStreet", "Indeed"];

        private const int CandidateCount = 120;

        public static async Task SeedAsync(AppDbContext context)
        {
            if (await context.Jobs.AnyAsync())
            {
                Console.WriteLine("DevDataSeeder: Jobs already exist - skipping (idempotent).");
                return;
            }

            var jobs = JobsToSeed
                .Select(j => new Job
                {
                    JobTitle = j.Title,
                    Location = "Remote",
                    JobType = "Full-time",
                    JobStatus = "Open",
                    JobDescription = $"Sample {j.Title} opening for dashboard analytics seed data.",
                    Department = j.Department,
                    Qualifications = [],
                    TechSkills = [],
                })
                .ToList();

            context.Jobs.AddRange(jobs);
            await context.SaveChangesAsync();

            var statuses = await context.ApplicantStatuses.Where(s => s.IsActive).ToListAsync();

            // Fixed seed so the generated data (and therefore the charts) look the same on
            // every machine that runs this.
            var random = new Random(12345);
            var now = DateTime.UtcNow;
            var candidates = new List<Candidate>(CandidateCount);

            for (var i = 0; i < CandidateCount; i++)
            {
                var job = jobs[random.Next(jobs.Count)];
                var status = statuses[random.Next(statuses.Count)];
                var source = Sources[random.Next(Sources.Length)];

                // Spread across the last 30 days (weighted toward recent) so both "all time"
                // charts and the current-week volume chart have data.
                var daysAgo = random.Next(0, 30);

                candidates.Add(new Candidate
                {
                    EmailAddress = $"sample.candidate{i}@example.com",
                    FirstName = $"Applicant{i}",
                    LastName = "Sample",
                    PhoneNumber = "09170000000",
                    YearsOfExperience = random.Next(0, 10),
                    ResumeFileName = "resume.pdf",
                    Role = job.JobTitle,
                    ApplicantStatusId = status.StatusId,
                    JobId = job.JobId,
                    SourcOfApplication = source,
                    CreatedAt = now.AddDays(-daysAgo).AddHours(-random.Next(0, 24)),
                });
            }

            context.Candidates.AddRange(candidates);
            await context.SaveChangesAsync();

            Console.WriteLine($"DevDataSeeder: seeded {jobs.Count} jobs and {candidates.Count} candidates.");
        }
    }
}
