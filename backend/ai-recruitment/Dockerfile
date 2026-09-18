# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so Docker can cache the layer when only source changes.
COPY ai-recruitment.csproj ./
RUN dotnet restore ai-recruitment.csproj

COPY . ./
RUN dotnet publish ai-recruitment.csproj -c Release -o /app /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Program.cs reads the PORT env var (which Render injects automatically) and
# rebinds Kestrel to it at startup, overriding ASPNETCORE_URLS below. These
# two lines are just a fallback for running the image outside Render
# (e.g. `docker run`) without a PORT variable set.
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ai-recruitment.dll"]
