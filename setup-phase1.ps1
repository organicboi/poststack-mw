# Phase 1 Implementation Setup Script
# Run this script to set up Phase 1 of the middleware merge

Write-Host "🚀 Setting up Phase 1: Foundation Layer" -ForegroundColor Green
Write-Host "======================================="

# Check if .env file exists
if (-Not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.phase1" ".env"
    Write-Host "✅ .env file created. Please update it with your actual values." -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file already exists. Please ensure it has the required Phase 1 variables." -ForegroundColor Yellow
}

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed." -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "🗄️  Database Setup Required:" -ForegroundColor Cyan
Write-Host "1. Open your Supabase dashboard"
Write-Host "2. Go to SQL Editor"
Write-Host "3. Run the database-schema.sql file"
Write-Host "   Location: ./database-schema.sql"
Write-Host ""

Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update your .env file with actual Supabase credentials"
Write-Host "2. Set a strong JWT_SECRET (at least 32 characters)"
Write-Host "3. Configure ADMIN_EMAILS"
Write-Host "4. Run the database schema in Supabase SQL editor"
Write-Host "5. Test the application: npm run dev"
Write-Host ""

Write-Host "📁 Phase 1 Files Created:" -ForegroundColor Cyan
Write-Host "- database-schema.sql (Database migration)"
Write-Host "- src/types/enhanced.types.ts (TypeScript interfaces)"
Write-Host "- src/services/supabase.service.ts (Database abstraction)"
Write-Host "- src/utils/error-handler.ts (Error handling system)"
Write-Host "- src/auth/enhanced-auth.service.ts (Authentication service)"
Write-Host "- src/auth/enhanced-auth.middleware.ts (Auth middleware)"
Write-Host "- .env.phase1 (Environment template)"
Write-Host ""

Write-Host "✅ Phase 1 Setup Complete!" -ForegroundColor Green
Write-Host "You can now proceed with database migration and testing." -ForegroundColor Green