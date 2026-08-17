using ai_recruitment.Features.ApplicationStatuses;
using ai_recruitment.Features.Candidates;
using Microsoft.EntityFrameworkCore;

namespace ai_recruitment.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)

        {


        }
        // Define your DbSets here
        // public DbSet<YourEntity> YourEntities { get; set; }
       // public DbSet<Product> Products => Set<Product>();   --- sample 
       public DbSet<Candidate> Candidates => Set<Candidate>();
       public DbSet<ApplicantStatus> ApplicantStatuses => Set<ApplicantStatus>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // GUID default for applicant id
            modelBuilder.Entity<Applicant>()
                .Property(a => a.Id)
                .HasDefaultValueSql("gen_random_uuid()");

            // unique email
            modelBuilder.Entity<Applicant>()
                .HasIndex(a => a.EmailAddress)
                .IsUnique();

            // seed statuses
            modelBuilder.Entity<ApplicantStatus>().HasData(
                new ApplicantStatus { StatusId = 1, StatusName = "Application Submitted", Description = "Candidate submitted application", Color = "#3B82F6", SortOrder = 1, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 2, StatusName = "AI Screening passed", Description = "Candidate passed AI screening", Color = "#3B82F6", SortOrder = 2, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 3, StatusName = "Initial Interview", Description = "Candidate is scheduled for an initial interview", Color = "#8B5CF6", SortOrder = 3, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 4, StatusName = "Technical Interview", Description = "Candidate is scheduled for a technical interview", Color = "#F59E0B", SortOrder = 4, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 5, StatusName = "Final Interview", Description = "Candidate is scheduled for a final interview", Color = "#F97316", SortOrder = 5, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 6, StatusName = "Job Offer", Description = "Candidate is in the job offer stage", Color = "#06B6D4", SortOrder = 6, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 7, StatusName = "Requirements Gathering", Description = "Candidate is submitting required documents", Color = "#6366F1", SortOrder = 6, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 8, StatusName = "Background Check", Description = "Candidate is undergoing background verification", Color = "#A855F7", SortOrder = 7, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 9, StatusName = "Onboarding", Description = "Candidate is currently in the onboarding process", Color = "#14B8A6", SortOrder = 8, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 10, StatusName = "Offered", Description = "Job offer has been formally extended to the candidate", Color = "#22C55E", SortOrder = 9, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
                new ApplicantStatus { StatusId = 11, StatusName = "Rejected", Description = "Candidate was rejected during the recruitment process", Color = "#EF4444", SortOrder = 10, IsActive = true, CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
            );
            }
    }
}
