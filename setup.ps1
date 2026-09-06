Write-Host "Setting up NOC BTS Management Application..."
Write-Host "Checking for Node.js..."

try {
    $nodeVersion = node -v
    Write-Host "Node.js is installed: $nodeVersion"
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please download and install Node.js from https://nodejs.org/"
    Write-Host "After installing, open a NEW terminal and run this script again."
    exit 1
}

Write-Host "Installing dependencies..."
npm install

Write-Host "Setup complete! You can now run .\start.ps1 to start the development server." -ForegroundColor Green
