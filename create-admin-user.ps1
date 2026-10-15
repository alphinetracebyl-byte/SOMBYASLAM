$SUPABASE_URL   = "https://hkcnldafksaenuvsktec.supabase.co"
$ADMIN_EMAIL    = "admin@qxlits.gov.so"
$ADMIN_PASSWORD = "Admin@2026!"

Write-Host "QXLITS Super Admin Setup" -ForegroundColor Cyan
Write-Host "Paste your Supabase service_role key (Settings -> API Keys -> Reveal):"
$KEY = Read-Host

if (-not $KEY) { Write-Host "No key entered." -ForegroundColor Red; exit 1 }

$h = @{ "apikey" = $KEY; "Authorization" = "Bearer $KEY"; "Content-Type" = "application/json" }

Write-Host "[1/3] Checking for existing user..." -ForegroundColor Yellow
$list = Invoke-RestMethod -Method Get -Uri "$SUPABASE_URL/auth/v1/admin/users" -Headers $h -ErrorAction SilentlyContinue
$existing = $list.users | Where-Object { $_.email -eq $ADMIN_EMAIL } | Select-Object -First 1
if ($existing) {
    Write-Host "    Deleting existing user $($existing.id)..." -ForegroundColor Gray
    Invoke-RestMethod -Method Delete -Uri "$SUPABASE_URL/auth/v1/admin/users/$($existing.id)" -Headers $h | Out-Null
    Write-Host "    Deleted." -ForegroundColor Gray
}

Write-Host "[2/3] Creating auth user..." -ForegroundColor Yellow
$body1 = "{`"email`":`"$ADMIN_EMAIL`",`"password`":`"$ADMIN_PASSWORD`",`"email_confirm`":true}"
$newUser = Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/auth/v1/admin/users" -Headers $h -Body $body1
Write-Host "    Created UID: $($newUser.id)" -ForegroundColor Green

Write-Host "[3/3] Adding to user_registrations..." -ForegroundColor Yellow
$h2 = @{ "apikey" = $KEY; "Authorization" = "Bearer $KEY"; "Content-Type" = "application/json"; "Prefer" = "return=minimal" }
$body2 = "{`"full_name`":`"QXLITS Super Admin`",`"email`":`"$ADMIN_EMAIL`",`"role`":`"NATIONAL_ADMIN`",`"territory_type`":`"NATIONAL`",`"position_title`":`"System Administrator`",`"status`":`"ACTIVE`"}"
Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/rest/v1/user_registrations" -Headers $h2 -Body $body2 | Out-Null
Write-Host "    Done." -ForegroundColor Green

Write-Host ""
Write-Host "Login at http://localhost:3001" -ForegroundColor Cyan
Write-Host "Email   : $ADMIN_EMAIL" -ForegroundColor White
Write-Host "Password: $ADMIN_PASSWORD" -ForegroundColor White
