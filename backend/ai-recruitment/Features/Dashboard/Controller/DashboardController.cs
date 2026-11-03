using System.Globalization;
using ai_recruitment.Data;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Candidates.model;
using ai_recruitment.Features.Dashboard.Dto;
using ai_recruitment.Features.Dashboard.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ai_recruitment.Features.Dashboard.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        // Fixed, known order - also the order the frontend's CATEGORICAL_COLORS palette is
        // indexed by, so a source always renders in the same color even at 0 or when other
        // counts change. Anything not recognized (including a null/blank source) is "Other".
        private static readonly string[] SourceLabels = ["LinkedIn", "Referral", "Company Website", "JobStreet", "Other"];
        private const string OtherSourceLabel = "Other";
        private const int TopJobsCount = 6;

        private static readonly IReadOnlyDictionary<string, string> KnownSourceAliases =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["LinkedIn"] = "LinkedIn",
                ["Referral"] = "Referral",
                ["Company Website"] = "Company Website",
                ["JobStreet"] = "JobStreet",
            };

        private readonly AppDbContext _context;
        private readonly DashboardOptions _options;
        private readonly TimeProvider _timeProvider;

        public DashboardController(AppDbContext context, IOptions<DashboardOptions> options, TimeProvider timeProvider)
        {
            _context = context;
            _options = options.Value;
            _timeProvider = timeProvider;
        }

        [HttpGet("analytics")]
        [HasPermission(PermissionNames.Candidates.View)]
        public async Task<IActionResult> GetAnalytics([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken cancellationToken)
        {
            var candidates = _context.Candidates.AsNoTracking().AsQueryable();

            if (from.HasValue)
            {
                candidates = candidates.Where(c => c.CreatedAt >= DateTime.SpecifyKind(from.Value, DateTimeKind.Utc));
            }

            if (to.HasValue)
            {
                candidates = candidates.Where(c => c.CreatedAt < DateTime.SpecifyKind(to.Value, DateTimeKind.Utc));
            }

            var result = new DashboardAnalyticsDto
            {
                ApplicantsBySource = await BuildApplicantsBySourceAsync(candidates, cancellationToken),
                ApplicantsByJob = await BuildApplicantsByJobAsync(candidates, cancellationToken),
                ApplicantsByStatus = await BuildApplicantsByStatusAsync(candidates, cancellationToken),
                // Always the current week regardless of from/to - a separate, fixed window per spec.
                WeeklyApplicationVolume = await BuildWeeklyVolumeAsync(cancellationToken),
            };

            return Ok(result);
        }

        // GROUP BY runs in the database; only the (small) distinct-source rows are materialized,
        // then folded into the fixed label set in memory.
        private static async Task<List<SourceCountDto>> BuildApplicantsBySourceAsync(IQueryable<Candidate> candidates, CancellationToken cancellationToken)
        {
            var raw = await candidates
                .GroupBy(c => c.SourcOfApplication)
                .Select(g => new { Source = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var counts = SourceLabels.ToDictionary(label => label, _ => 0);

            foreach (var row in raw)
            {
                var label = row.Source != null && KnownSourceAliases.TryGetValue(row.Source.Trim(), out var known)
                    ? known
                    : OtherSourceLabel;
                counts[label] += row.Count;
            }

            return SourceLabels
                .Select(label => new SourceCountDto { Label = label, Count = counts[label] })
                .ToList();
        }

        private static async Task<List<JobCountDto>> BuildApplicantsByJobAsync(IQueryable<Candidate> candidates, CancellationToken cancellationToken)
        {
            return await candidates
                .GroupBy(c => new { c.JobId, c.Job.JobTitle })
                .Select(g => new JobCountDto { JobId = g.Key.JobId, JobTitle = g.Key.JobTitle, Count = g.Count() })
                .OrderByDescending(j => j.Count)
                .Take(TopJobsCount)
                .ToListAsync(cancellationToken);
        }

        // The project's ApplicantStatus table is the stage source of truth (not a fixed sample
        // list) - every active status is returned, zero-filled, in its configured SortOrder.
        private async Task<List<StatusCountDto>> BuildApplicantsByStatusAsync(IQueryable<Candidate> candidates, CancellationToken cancellationToken)
        {
            var countsByStatusId = await candidates
                .GroupBy(c => c.ApplicantStatusId)
                .Select(g => new { StatusId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.StatusId, g => g.Count, cancellationToken);

            var statuses = await _context.ApplicantStatuses
                .AsNoTracking()
                .Where(s => s.IsActive)
                .OrderBy(s => s.SortOrder)
                .ToListAsync(cancellationToken);

            return statuses
                .Select(s => new StatusCountDto
                {
                    Status = s.StatusName,
                    Count = countsByStatusId.GetValueOrDefault(s.StatusId),
                })
                .ToList();
        }

        // Postgres has no knowledge of IANA time zones through EF's LINQ translation, so the
        // week range is resolved in the configured zone first, then only that week's
        // CreatedAt values (not the whole table) are pulled down to bucket by local calendar
        // day - the DB still does the heavy filtering, just not the final day grouping.
        private async Task<List<DailyCountDto>> BuildWeeklyVolumeAsync(CancellationToken cancellationToken)
        {
            var timeZone = ResolveTimeZone();
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(_timeProvider.GetUtcNow().UtcDateTime, timeZone);
            var todayLocal = nowLocal.Date;

            var daysSinceMonday = ((int)todayLocal.DayOfWeek + 6) % 7;
            var mondayLocal = todayLocal.AddDays(-daysSinceMonday);
            var weekEndLocalExclusive = mondayLocal.AddDays(7);

            var mondayUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(mondayLocal, DateTimeKind.Unspecified), timeZone);
            var weekEndUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(weekEndLocalExclusive, DateTimeKind.Unspecified), timeZone);

            var createdAtTimestamps = await _context.Candidates
                .AsNoTracking()
                .Where(c => c.CreatedAt >= mondayUtc && c.CreatedAt < weekEndUtc)
                .Select(c => c.CreatedAt)
                .ToListAsync(cancellationToken);

            var countsByLocalDate = createdAtTimestamps
                .GroupBy(createdAtUtc => TimeZoneInfo.ConvertTimeFromUtc(createdAtUtc, timeZone).Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var result = new List<DailyCountDto>(7);
            for (var i = 0; i < 7; i++)
            {
                var date = mondayLocal.AddDays(i);
                result.Add(new DailyCountDto
                {
                    Day = date.ToString("ddd", CultureInfo.InvariantCulture),
                    Date = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Count = countsByLocalDate.GetValueOrDefault(date),
                });
            }

            return result;
        }

        private TimeZoneInfo ResolveTimeZone()
        {
            if (string.IsNullOrWhiteSpace(_options.TimeZoneId))
            {
                return TimeZoneInfo.Utc;
            }

            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(_options.TimeZoneId);
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return TimeZoneInfo.Utc;
            }
        }
    }
}
