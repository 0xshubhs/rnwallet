#!/bin/bash

# Ethereum Wallet - Quick HTTPS Setup with ngrok

echo "🔐 Setting up HTTPS for MetaMask mobile testing..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Please install ngrok first:"
    echo "  macOS: brew install ngrok"
    echo "  Or download from: https://ngrok.com/download"
    echo ""
    exit 1
fi

echo "✅ ngrok is installed"
echo ""

# Check if backend is running
if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend is not running on port 3000"
    echo ""
    echo "Please start your backend first:"
    echo "  cd server && npm run dev"
    echo ""
    exit 1
fi

echo "✅ Backend is running on port 3000"
echo ""

# Start ngrok
echo "🚀 Starting ngrok tunnel..."
echo ""
echo "📝 Instructions:"
echo "1. Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)"
echo "2. Update BACKEND_URL in frontend/app/(tabs)/index.tsx"
echo "3. Reload your React Native app (press 'r' in Expo)"
echo "4. Tap 'Open in MetaMask Browser' in your app"
echo ""
echo "Press Ctrl+C to stop ngrok when done"
echo ""

ngrok http 3001
