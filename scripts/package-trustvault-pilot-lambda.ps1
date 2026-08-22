[CmdletBinding()]
param(
  [string]$OutputDirectory = (Join-Path ([System.IO.Path]::GetTempPath()) "trustvault-pilot-lambda-package")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$sourceDirectory = Join-Path $repositoryRoot "backend\aws\trustvault-pilot-api"
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$stagingDirectory = Join-Path $resolvedOutput "staging"
$artifactPath = Join-Path $resolvedOutput "trustvault-pilot-api.zip"

$requiredFiles = @(
  "handler.cjs",
  "auth-challenge.cjs",
  "auth-verify.cjs",
  "customer-identity.cjs",
  "session.cjs",
  "customer-profile.cjs",
  "marketplace-order.cjs",
  "marketplace-receipt.cjs",
  "bill-split.cjs",
  "gift-vault.cjs",
  "package.json",
  "package-lock.json"
)

foreach ($file in $requiredFiles) {
  $sourcePath = Join-Path $sourceDirectory $file
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Required Lambda deployment file is missing: $sourcePath"
  }
}

if (Test-Path -LiteralPath $stagingDirectory) {
  Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDirectory -Force | Out-Null

foreach ($file in $requiredFiles) {
  Copy-Item -LiteralPath (Join-Path $sourceDirectory $file) -Destination (Join-Path $stagingDirectory $file)
}

Push-Location $stagingDirectory
try {
  & npm.cmd ci --ignore-scripts --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) {
    throw "npm ci failed while installing Lambda runtime dependencies."
  }
} finally {
  Pop-Location
}

foreach ($module in @("@aws-sdk\client-dynamodb", "viem")) {
  if (-not (Test-Path -LiteralPath (Join-Path $stagingDirectory "node_modules\$module\package.json") -PathType Leaf)) {
    throw "Required Lambda runtime dependency was not installed: $module"
  }
}

$sourceHandler = Join-Path $stagingDirectory "handler.cjs"
$bundledHandler = Join-Path $stagingDirectory "handler.bundle.cjs"
& (Join-Path $stagingDirectory "node_modules\.bin\esbuild.cmd") `
  $sourceHandler `
  --bundle `
  --platform=node `
  --target=node20 `
  --format=cjs `
  "--outfile=$bundledHandler"
if ($LASTEXITCODE -ne 0) {
  throw "Lambda dependency bundling failed."
}

Move-Item -LiteralPath $bundledHandler -Destination $sourceHandler -Force

$compatibilityIndex = @(
  'const { handler } = require("./handler.cjs");',
  '',
  'module.exports = {',
  '  handler,',
  '};'
) -join [Environment]::NewLine

Set-Content `
  (Join-Path $stagingDirectory "index.js") `
  $compatibilityIndex `
  -Encoding UTF8

Remove-Item -LiteralPath (Join-Path $stagingDirectory "node_modules") -Recurse -Force

& node -e "const value=require(process.argv[1]); if(typeof value.handler!=='function') process.exit(1)" $sourceHandler
if ($LASTEXITCODE -ne 0) {
  throw "Self-contained Lambda handler export is invalid."
}

if (Test-Path -LiteralPath $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $stagingDirectory,
  $artifactPath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

$archive = [System.IO.Compression.ZipFile]::OpenRead($artifactPath)
try {
  $entryNames = @($archive.Entries | ForEach-Object FullName)
  foreach ($file in $requiredFiles) {
    if ($entryNames -notcontains $file.Replace("\", "/")) {
      throw "Deployment artifact is missing required entry: $file"
    }
  }

  if ($entryNames -notcontains "index.js") {
    throw "Deployment artifact is missing compatibility entry: index.js"
  }
  $forbidden = $entryNames | Where-Object {
    $_ -match '(^|/)(\.env|\.git)(/|$)' -or
    $_ -match '\.test\.(mjs|cjs|js)$' -or
    $_ -match '(^|/)(\.trustvault-backups|trustvault-[^/]+)(/|$)'
  }
  if ($forbidden) {
    throw "Deployment artifact contains forbidden entries: $($forbidden -join ', ')"
  }
} finally {
  $archive.Dispose()
}

Write-Output "Lambda artifact: $artifactPath"
Write-Output "Artifact bytes: $((Get-Item -LiteralPath $artifactPath).Length)"
Write-Output "Artifact SHA256: $((Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash)"
Write-Output "Primary handler: handler.handler"
Write-Output "Deployment compatibility handler: index.handler"
Write-Output "Runtime source files: $($requiredFiles -join ', ')"



