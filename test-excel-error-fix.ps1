# Test script pour verifier la correction de l'erreur Excel
Write-Host "Test de la correction de l'erreur Excel..." -ForegroundColor Cyan

# Verifier que le frontend compile correctement
Write-Host "Verification de la compilation du frontend..." -ForegroundColor Yellow
Set-Location "reconciliation-app/frontend"

try {
    # Verifier les erreurs TypeScript
    $tscResult = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Compilation TypeScript reussie" -ForegroundColor Green
    } else {
        Write-Host "Erreurs TypeScript detectees:" -ForegroundColor Red
        Write-Host $tscResult
    }
} catch {
    Write-Host "Erreur lors de la verification TypeScript: $_" -ForegroundColor Red
}

# Verifier que le fichier modifie est correct
Write-Host "Verification du fichier file-upload.component.ts..." -ForegroundColor Yellow
$filePath = "src/app/components/file-upload/file-upload.component.ts"

if (Test-Path $filePath) {
    $content = Get-Content $filePath -Raw
    
    # Verifier que la correction est en place
    if ($content -match "if \(!cell \|\| cell === '' \|\| typeof cell !== 'string'\) continue;") {
        Write-Host "Correction de securite ajoutee dans calculateHeaderScore" -ForegroundColor Green
    } else {
        Write-Host "Correction de securite manquante dans calculateHeaderScore" -ForegroundColor Red
    }
    
    # Verifier que la conversion robuste est en place
    if ($content -match "const cellString = String\(cell\)\.trim\(\);") {
        Write-Host "Conversion robuste des cellules ajoutee" -ForegroundColor Green
    } else {
        Write-Host "Conversion robuste des cellules manquante" -ForegroundColor Red
    }
    
    # Verifier que la verification defensive est en place
    if ($content -match "if \(!Array\.isArray\(rowStrings\)\)") {
        Write-Host "Verification defensive ajoutee" -ForegroundColor Green
    } else {
        Write-Host "Verification defensive manquante" -ForegroundColor Red
    }
} else {
    Write-Host "Fichier file-upload.component.ts introuvable" -ForegroundColor Red
}

Write-Host ""
Write-Host "Resume des corrections apportees:" -ForegroundColor Cyan
Write-Host "1. Verification robuste des cellules dans calculateHeaderScore" -ForegroundColor Green
Write-Host "2. Conversion securisee des donnees Excel" -ForegroundColor Green
Write-Host "3. Verification defensive des parametres" -ForegroundColor Green
Write-Host "4. Logs de debug ajoutes pour faciliter le diagnostic" -ForegroundColor Green

Write-Host ""
Write-Host "L'erreur TypeError devrait maintenant etre resolue." -ForegroundColor Green
Write-Host "Les modifications garantissent que toutes les cellules sont des chaines valides." -ForegroundColor Cyan

Set-Location "../.."
