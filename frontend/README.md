# Ethereum Wallet - React Native Frontend

React Native mobile app with Ethereum wallet integration using WebView.

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure backend URL:
Edit `app/(tabs)/index.tsx` and update the `BACKEND_URL` constant to point to your backend server.

3. Start the app:
```bash
# Start Expo
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## Features

- **Wallet Connection**: Connect Ethereum wallets (MetaMask, Trust Wallet, etc.)
- **Authentication**: Sign messages for secure authentication
- **Transactions**: Send Ethereum transactions
- **WebView Integration**: Embedded DApp browser with React Native messaging
- **Deep Linking**: Support for MetaMask mobile deep links

## Components

### WalletWebView
The main component that renders a WebView with the DApp page and handles bidirectional messaging between React Native and the web page.

### Home Screen
Landing page with options to:
- Connect via embedded browser
- Open in MetaMask mobile

## Configuration

Update these constants in `app/(tabs)/index.tsx`:
- `BACKEND_URL`: Your backend server URL (default: `http://localhost:3000`)
- `DAPP_URL`: The DApp page URL served by your backend

## How It Works

1. User taps "Connect Wallet"
2. WebView loads the DApp page from backend
3. DApp page connects to wallet using `window.ethereum`
4. User signs messages/transactions in wallet
5. Results are sent back to React Native via `window.ReactNativeWebView.postMessage()`
6. React Native handles authentication and displays results

## Deep Linking

MetaMask mobile deep link format:
```
https://metamask.app.link/dapp/{YOUR_DAPP_URL}
```

Other wallets support similar schemes (e.g., Trust Wallet, Rainbow).

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.