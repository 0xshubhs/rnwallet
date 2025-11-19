# Setting Up HTTPS for MetaMask Mobile Testing

MetaMask mobile requires HTTPS for security. Here's how to set up HTTPS for local development:

## Option 1: Using ngrok (Recommended for Testing)

### Install ngrok
```bash
# macOS (using Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
```

### Start your backend server
```bash
cd server
npm run dev
# Server running on http://localhost:3000
```

### Create HTTPS tunnel
In a new terminal:
```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### Update your React Native app
Edit `frontend/app/(tabs)/index.tsx`:
```typescript
// Replace this:
const BACKEND_URL = 'http://192.168.3.126:3000';

// With your ngrok URL:
const BACKEND_URL = 'https://abc123.ngrok.io';
```

### Restart your app
Press `r` in the Expo terminal to reload.

Now when you tap "Open in MetaMask Browser", it will work properly with HTTPS!

## Option 2: Local HTTPS with Self-Signed Certificate

### Generate SSL certificate
```bash
cd server
# Create SSL directory
mkdir ssl

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

### Update server code
Edit `server/src/index.ts`:
```typescript
import express from 'express';
import https from 'https';
import fs from 'fs';

const app = express();
// ... your existing middleware ...

// HTTPS server
const httpsOptions = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
};

https.createServer(httpsOptions, app).listen(3000, () => {
  console.log('HTTPS Server running on port 3000');
});
```

**Note:** Self-signed certificates will show security warnings in browsers/MetaMask.

## Option 3: Deploy to Production

For production use, deploy your backend to a service with HTTPS:

- **Heroku**: Free tier with HTTPS
- **Railway**: Easy deployment with HTTPS
- **Vercel**: Serverless with HTTPS
- **AWS/Azure/GCP**: Full control with SSL certificates

## Current Status

Your backend is running on:
- **Local:** `http://192.168.3.126:3000`
- **Issue:** HTTP doesn't work with MetaMask mobile
- **Solution:** Use ngrok for quick testing

## Quick Start with ngrok

```bash
# Terminal 1: Start backend
cd server && npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update BACKEND_URL in frontend/app/(tabs)/index.tsx
# Reload React Native app

# Terminal 3: Run React Native
cd frontend && npm start
```

## Alternative: Use Embedded Browser for Testing

The embedded WebView in your app works with HTTP, but it cannot access MetaMask. Use it to test the UI, but for wallet functionality, you must use MetaMask browser with HTTPS.
