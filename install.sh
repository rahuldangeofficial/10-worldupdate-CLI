#!/bin/bash

# worldupdate local installer
# Run this AFTER cloning the repo

set -e

echo "Installing worldupdate..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18+ required. You have $(node -v)"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
if command -v yarn &> /dev/null; then
    yarn install
    yarn link
else
    npm install
    npm link
fi

echo ""
echo "worldupdate installed successfully!"
echo ""
echo "Setup your API key:"
echo "  echo 'OPENAI_API_KEY=sk-your-key' > ~/.worldupdate.env"
echo ""
echo "Usage:"
echo "  worldupdate          # daily news"
echo "  worldupdate --digest # weekly digest"
echo ""
