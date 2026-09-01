using ai_recruitment.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Railway (and most PaaS hosts) inject the port to listen on via PORT.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Connection string comes from configuration (ConnectionStrings:DefaultConnection)
// or from a Railway-style DATABASE_URL (postgresql://user:pass@host:port/db).
var connectionString = ResolveConnectionString(builder.Configuration);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Allowed browser origins come from configuration (Cors:AllowedOrigins),
// falling back to localhost for local development.
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
var allowedOrigins = configuredOrigins is { Length: > 0 }
    ? configuredOrigins
    : new[]
    {
        "http://localhost:3000", "https://localhost:3000",
        "http://localhost:3001", "https://localhost:3001"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});
builder.Services.AddHttpClient();

var app = builder.Build();

// Apply pending EF Core migrations on startup, retrying briefly so the app can
// wait for the database to become reachable after a cold start.
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

    // TLS is terminated at the Railway edge proxy in production, so only
    // redirect to HTTPS when running locally.
    app.UseHttpsRedirection();
}

// Serve static files from wwwroot (uploads will be placed under wwwroot/uploads)
app.UseStaticFiles();

// Enable CORS using the named policy
app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();

static string ResolveConnectionString(IConfiguration configuration)
{
    var fromConfig = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(fromConfig))
    {
        return fromConfig;
    }

    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (string.IsNullOrWhiteSpace(databaseUrl))
    {
        throw new InvalidOperationException(
            "No database connection string configured. Set ConnectionStrings__DefaultConnection or DATABASE_URL.");
    }

    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);

    var csb = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        Database = uri.AbsolutePath.TrimStart('/'),
        SslMode = SslMode.Prefer,
    };

    return csb.ConnectionString;
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
            db.Database.Migrate();
            return;
        }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            logger.LogWarning(ex, "Database migration attempt {Attempt}/{Max} failed; retrying in 3s.", attempt, maxAttempts);
            Thread.Sleep(TimeSpan.FromSeconds(3));
        }
    }
}
