using ai_recruitment.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

//using swagger
//builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

// Get connection string from DATABASE_URL environment variable (set by Railway)
// Falls back to DefaultConnection in appsettings.json for local development
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000", "http://localhost:3001", "https://localhost:3001")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});
builder.Services.AddHttpClient();

var app = builder.Build();

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
}

app.UseHttpsRedirection();

// Serve static files from wwwroot (uploads will be placed under wwwroot/uploads)
app.UseStaticFiles();

// Enable CORS using the named policy
app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();

