 Param(
   [string]$JavaExe = "C:\\Program Files\\Java\\jdk-11\\bin\\java.exe",
   [string]$JarPath = "C:\\reconciliation\\backend\\app.jar",
   [string]$AppDir = "C:\\reconciliation\\backend",
   [string]$WatchFolder = "C:\\reconciliation\\watch-folder",
   [string]$ServiceName = "ReconciliationBackend",
   [string]$DbUrl = "jdbc:mysql://127.0.0.1:3306/reconciliation?useSSL=false&serverTimezone=UTC",
   [string]$DbUser = "reco",
   [string]$DbPassword = "CHANGER_CE_MOT_DE_PASSE"
 )

 if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
   Write-Host "nssm non trouvé. Installer avec: choco install nssm -y" -ForegroundColor Yellow
   exit 1
 }

 New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
 New-Item -ItemType Directory -Force -Path $WatchFolder | Out-Null
 New-Item -ItemType Directory -Force -Path "C:\\reconciliation\\logs" | Out-Null

 $envVars = @(
   "SPRING_PROFILES_ACTIVE=prod",
   "SPRING_DATASOURCE_URL=$DbUrl",
   "SPRING_DATASOURCE_USERNAME=$DbUser",
   "SPRING_DATASOURCE_PASSWORD=$DbPassword",
   "APP_WATCH_FOLDER=$WatchFolder"
 )

 nssm install $ServiceName $JavaExe -Xms512m -Xmx2g -jar $JarPath
 nssm set $ServiceName AppDirectory $AppDir
 nssm set $ServiceName AppEnvironmentExtra $envVars
 nssm set $ServiceName Start SERVICE_AUTO_START
 nssm start $ServiceName
 Write-Host "Service $ServiceName installé et démarré." -ForegroundColor Green

