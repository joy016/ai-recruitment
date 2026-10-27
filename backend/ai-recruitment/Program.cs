using ai_recruitment.Data;
using ai_recruitment.Features.ApplicantScreening.Services;
using ai_recruitment.Features.Authorization;
using ai_recruitment.Features.Roles;
using ai_recruitment.Features.Users;
using ai_recruitment.Features.Users.Services;
using ai_recruitment.Service;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Render assigns the port to listen on via the PORT env var and expects the
// app to bind to 0.0.0.0 on that port. Locally (Development/Production
// simulation) PORT is not set, so launchSettings.json / Dockerfile defaults
// are left untouched.
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);


var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(renderPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(ResolveConnectionString(builder)));


builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero // optional: remove default 5 min leeway
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddScoped<ITokenService, TokenService>();

// Permission-based authorization: policies are created on demand for every
// "Permission:<name>" name requested by [HasPermission], rather than being
// registered one by one with AddPolicy.
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddScoped<IRolePermissionService, RolePermissionService>();

// Invitation-based account activation. Email delivery itself lives in n8n; this app
// only publishes the invitation event to the configured webhook.
builder.Services.AddSingleton<IWeakPasswordChecker, CommonPasswordChecker>();
builder.Services.AddScoped<IUserInvitationService, UserInvitationService>();

// Environment variables win over appsettings so Render/Vercel deployments stay
// config-only; nothing below has a hardcoded fallback value.
builder.Services.AddOptions<N8nInvitationOptions>()
    .Configure<IConfiguration>((options, configuration) =>
    {
        options.WebhookUrl = configuration[N8nInvitationOptions.EnvWebhookUrl]
            ?? configuration["N8n:InvitationWebhookUrl"];

        options.WebhookSecret = configuration[N8nInvitationOptions.EnvWebhookSecret]
            ?? configuration["N8n:WebhookSecret"];

        // No custom env var name here: ASP.NET Core's built-in environment variable
        // provider already maps Frontend__BaseUrl (Render) onto the "Frontend:BaseUrl"
        // config key, which falls back to appsettings.Development.json locally.
        options.FrontendBaseUrl = configuration["Frontend:BaseUrl"];

        // Lets a developer point at a locally-running n8n over http://localhost:5678.
        options.AllowInsecureHttp = builder.Environment.IsDevelopment();
    });

builder.Services.AddHttpClient<IInvitationWebhookService, N8nInvitationWebhookService>((provider, client) =>
{
    var options = provider.GetRequiredService<IOptions<N8nInvitationOptions>>().Value;
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
});

// Dynamic applicant screening: candidate + job data -> n8n "applicant-screening" webhook,
// delivered durably via an outbox table + background dispatcher so a down/slow n8n never
// delays or fails the candidate's submission request.
builder.Services.AddOptions<N8nScreeningOptions>()
    .Configure<IConfiguration>((options, configuration) =>
    {
        options.WebhookUrl = configuration[N8nScreeningOptions.EnvWebhookUrl]
            ?? configuration["N8n:ScreeningWebhookUrl"];

        options.WebhookSecret = configuration[N8nScreeningOptions.EnvWebhookSecret]
            ?? configuration["N8n:ScreeningWebhookSecret"];

        options.CallbackSecret = configuration[N8nScreeningOptions.EnvCallbackSecret]
            ?? configuration["N8n:ScreeningCallbackSecret"];

        options.AllowInsecureHttp = builder.Environment.IsDevelopment();
    });

builder.Services.AddHttpClient<IApplicantScreeningWebhookService, N8nApplicantScreeningWebhookService>((provider, client) =>
{
    var options = provider.GetRequiredService<IOptions<N8nScreeningOptions>>().Value;
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
});

builder.Services.AddSingleton<ScreeningOutboxChannel>();
builder.Services.AddScoped<IScreeningRequestPublisher, ScreeningRequestPublisher>();
builder.Services.AddHostedService<ScreeningOutboxDispatcher>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Anonymous invitation endpoints: partitioned per client IP (AddFixedWindowLimiter
    // would otherwise apply one shared global limit across every caller).
    options.AddPolicy(RateLimiterPolicies.InvitationPublic, httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 10,
            QueueLimit = 0,
        });
    });

    // Admin-triggered resend: per authenticated caller.
    options.AddPolicy(RateLimiterPolicies.InvitationResend, httpContext =>
    {
        var callerId = httpContext.User.Identity?.Name ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(callerId, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromHours(1),
            PermitLimit = 5,
            QueueLimit = 0,
        });
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Local Next.js dev server(s).
            policy.WithOrigins(
                    "http://localhost:3000", "https://localhost:3000",
                    "http://localhost:3001", "https://localhost:3001")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            // Render provides this at runtime; it must be the Vercel frontend origin
            // (e.g. https://my-app.vercel.app). Supports a comma-separated list so
            // Vercel preview deployments can be added without a code change.
            var frontendUrl = builder.Configuration["FRONTEND_URL"]
                ?? throw new InvalidOperationException(
                    "FRONTEND_URL environment variable is required when ASPNETCORE_ENVIRONMENT=Production.");

            var allowedOrigins = frontendUrl
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

builder.Services.AddHttpClient();
builder.Services.AddHttpClient<ISupabaseStorageService, SupabaseStorageService>();

var app = builder.Build();

// Apply pending EF Core migrations on startup, retrying briefly so the app can
// wait for the database to become reachable.
ApplyMigrations(app);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Generate OpenAPI JSON
    app.MapOpenApi();

    // Swagger UI
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "AI Recruitment API");
    });

    // Render terminates TLS at its edge and forwards plain HTTP to the
    // container, so redirecting to HTTPS inside the app would either be a
    // no-op or (without forwarded-header handling) a redirect loop. Only
    // enforce it for local Development, where Kestrel really does serve
    // both an HTTP and an HTTPS endpoint.
    app.UseHttpsRedirection();
}
else
{
    // Trust Render's proxy headers so downstream code (e.g. Request.IsHttps,
    // generated links) sees the original https scheme even though Kestrel
    // itself only ever sees plain HTTP inside the container.
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    });
}

// Serve static files from wwwroot (uploads will be placed under wwwroot/uploads)
app.UseStaticFiles();

// Enable CORS using the named policy
app.UseCors("AllowFrontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// Used by Render's health check to detect a successful deploy.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapControllers();

app.Run();

// Development -> ConnectionStrings:DefaultConnection (appsettings.Development.json) -> local Postgres.
// Production  -> DATABASE_URL environment variable (set by Render)                  -> Supabase Postgres.
static string ResolveConnectionString(WebApplicationBuilder builder)
{
    if (builder.Environment.IsDevelopment())
    {
        return builder.Configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is missing from appsettings.Development.json.");
    }

    var databaseUrl = builder.Configuration["DATABASE_URL"]
        ?? throw new InvalidOperationException(
            "DATABASE_URL environment variable is required when ASPNETCORE_ENVIRONMENT=Production.");

    return ConvertDatabaseUrlToNpgsqlConnectionString(databaseUrl);
}

// Development -> Jwt:Key (appsettings.Development.json) -> a fixed local dev secret.
// Production  -> JWT_SECRET environment variable          -> a real, per-deployment secret.
//static string ResolveJwtSigningKey(WebApplicationBuilder builder)
//{
//    if (builder.Environment.IsDevelopment())
//    {
//        return builder.Configuration["Jwt:Key"]
//            ?? throw new InvalidOperationException("Jwt:Key is missing from appsettings.Development.json.");
//    }

//    return builder.Configuration["JWT_SECRET"]
//        ?? throw new InvalidOperationException(
//            "JWT_SECRET environment variable is required when ASPNETCORE_ENVIRONMENT=Production.");
//}

// Supabase (and most hosted Postgres providers) hand out connection info as a
// postgresql:// URI. Npgsql does not accept that format directly - it only
// understands ADO.NET-style "Key=Value;..." connection strings - so it has to
// be converted.
static string ConvertDatabaseUrlToNpgsqlConnectionString(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);

    var connectionStringBuilder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        SslMode = SslMode.Require
    };

    return connectionStringBuilder.ConnectionString;
}

static void ApplyMigrations(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    const int maxAttempts = 5;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            return;
        }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            logger.LogWarning(ex, "Database migration attempt {Attempt}/{Max} failed; retrying in 3s.", attempt, maxAttempts);
            Thread.Sleep(TimeSpan.FromSeconds(3));
        }
    }
}
