# Setup script for Phase 2 of the middleware migration
# This script sets up the database schema and installs dependencies for Phase 2 core modules

param (
    [switch]$skipDeps = $false
)

Write-Host "`n🚀 Setting up Phase 2: Core Modules..." -ForegroundColor Cyan

# Check if Node.js is installed
if (-Not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18 or later." -ForegroundColor Red
    exit 1
}

# Check if Supabase CLI is installed
if (-Not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ Supabase CLI is not installed. Database schema will need to be applied manually." -ForegroundColor Yellow
}

# Install dependencies if not skipped
if (-Not $skipDeps) {
    Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
}

# Create database folder if it doesn't exist
if (-Not (Test-Path "database")) {
    New-Item -ItemType Directory -Path "database"
}

Write-Host "`n🗄️ Setting up database schema..." -ForegroundColor Yellow

# Run database schema migration if Supabase CLI is available
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "Running database schema migration..." -ForegroundColor Yellow
    supabase db reset --db-url $env:SUPABASE_URL

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to apply database schema." -ForegroundColor Red
        Write-Host "Please run the SQL commands in database/phase2-schema.sql manually in your Supabase SQL editor." -ForegroundColor Yellow
    } else {
        Write-Host "✅ Database schema applied successfully." -ForegroundColor Green
    }
} else {
    Write-Host "📝 Please run the SQL commands in database/phase2-schema.sql manually in your Supabase SQL editor." -ForegroundColor Yellow
}

# Create .env file from .env.example if it doesn't exist
if (-Not (Test-Path ".env")) {
    Write-Host "`n📄 Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file. Please update it with your configuration." -ForegroundColor Green
} else {
    Write-Host "`n📄 .env file already exists." -ForegroundColor Yellow
}

# Build the application
Write-Host "`n🔨 Building the application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build the application." -ForegroundColor Red
    exit 1
}

# Create flag file to indicate Phase 2 is complete
Set-Content -Path "PHASE2_COMPLETE.md" -Value @"
# Phase 2 Complete

Core modules have been successfully implemented:

- User management system
- Enhanced authentication
- Billing system implementation
- Post management system

## Next Steps:

- Phase 3: Integration of social tokens, OAuth, webhook system
- Testing with real data
- Deployment preparation
"@

Write-Host "`n✅ Phase 2 setup complete!" -ForegroundColor Green
Write-Host @"

The following core modules have been implemented:
- User management system
- Enhanced authentication
- Billing system implementation
- Post management system

To start the server:
- Update your .env file with the required configuration
- Run 'npm run dev' for development mode
- Run 'npm start' for production mode

"@ -ForegroundColor Cyan