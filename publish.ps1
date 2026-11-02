$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE)." }
}

$login = & gh api user --jq .login
if ($LASTEXITCODE -ne 0) { throw 'GitHub login required: gh auth login -h github.com --web' }
if ($login.Trim() -ne 'PavelDykhne') { throw 'Expected GitHub account PavelDykhne.' }
$repository = 'PavelDykhne/stamp-collection'
$remote = "https://github.com/$repository.git"

if (-not (Test-Path -LiteralPath '.git')) {
    Invoke-Checked git @('init', '-b', 'main')
}
$remotes = @(& git remote)
if ($remotes -contains 'origin') {
    $currentRemote = & git remote get-url origin
    if ($currentRemote.Trim() -ne $remote) { throw 'Unexpected origin; no files pushed.' }
} else {
    Invoke-Checked git @('remote', 'add', 'origin', $remote)
}

$ErrorActionPreference = 'Continue'
& gh repo view $repository --json name *> $null
$repositoryLookupExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($repositoryLookupExit -ne 0) {
    Invoke-Checked gh @('repo', 'create', $repository, '--public', '--description', 'USSR stamp collection: album photos, identification and estimates')
}
Invoke-Checked git @('add', 'index.html', 'styles.css', 'app.js', 'data.js', 'media', '.nojekyll', 'README.md', 'publish.ps1')
& git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    Invoke-Checked git @('-c', 'user.name=PavelDykhne', '-c', 'user.email=13303506+PavelDykhne@users.noreply.github.com', 'commit', '-m', 'Add stamp collection catalog')
} elseif ($LASTEXITCODE -ne 0) { throw 'Cannot inspect staged changes.' }
Invoke-Checked git @('-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', '-u', 'origin', 'main')

$ErrorActionPreference = 'Continue'
& gh api "repos/$repository/pages" *> $null
$pagesLookupExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($pagesLookupExit -ne 0) {
    $payload = @{build_type='legacy';source=@{branch='main';path='/'}} | ConvertTo-Json -Compress
    $payload | & gh api "repos/$repository/pages" --method POST --input -
    if ($LASTEXITCODE -ne 0) { throw 'Sources uploaded, but GitHub Pages could not be enabled.' }
}
Write-Output "Repository: https://github.com/$repository"
Write-Output 'GitHub Pages: https://paveldykhne.github.io/stamp-collection/'
Write-Output 'The first deployment may take a few minutes.'
