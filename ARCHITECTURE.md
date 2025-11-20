# 🏗️ System Architecture Overview

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native App (Frontend)                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    HomeScreen Component                   │  │
│  │  • "Open in MetaMask" button (deep link)                  │  │
│  │  • "Try Embedded Browser" button (WebView)                │  │
│  │  • Authentication state management                        │  │
│  │  • User address display                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              WalletWebView Component                      │  │
│  │  • Embeds DApp page in WebView                            │  │
│  │  • Handles postMessage events                             │  │
│  │  • Calls backend API for verification                     │  │
│  │  • Displays alerts and notifications                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    MetaMask Deep Link
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              MetaMask Mobile In-App Browser                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      DApp Page (HTML/JS)                  │  │
│  │  • Detects window.ethereum provider                       │  │
│  │  • Connects to wallet (eth_requestAccounts)               │  │
│  │  • Fetches nonce from backend                             │  │
│  │  • Signs messages (personal_sign)                         │  │
│  │  • Creates & signs transactions                           │  │
│  │  • Posts messages to React Native                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                         HTTP/HTTPS
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Node.js Backend (Express)                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  API Endpoints                            │  │
│  │  • GET  /api/nonce      → Generate login nonce            │  │
│  │  • POST /api/verify     → Verify signature                │  │
│  │  • POST /api/createTx   → Prepare transaction             │  │
│  │  • POST /api/broadcast  → Broadcast signed tx             │  │
│  │  • GET  /api/tx/:hash   → Get transaction details         │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                Static File Serving                        │  │
│  │  • Serves /index.html (DApp page)                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Ethereum RPC Provider
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Ethereum Network (via RPC)                      │
│  • Infura / Alchemy / QuickNode                                 │
│  • Broadcasts transactions                                      │
│  • Queries transaction status                                   │
│  • Returns gas estimates                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### 1. Authentication Flow

```
┌──────────┐     1. Tap "Connect"    ┌────────────────┐
│   User   │ ─────────────────────── │  React Native  │
└──────────┘                         │   HomeScreen   │
                                     └────────────────┘
                                              │
                          2. Open MetaMask Deep Link
                                              ↓
                                      ┌────────────────┐
                                      │   MetaMask     │
                                      │   Browser      │
                                      └────────────────┘
                                              │
                            3. Load DApp Page (index.html)
                                              ↓
                                      ┌────────────────┐
                                      │   DApp Page    │
                                      │  (ethers.js)   │
                                      └────────────────┘
                                              │
                4. Request wallet connection (eth_requestAccounts)
                                              ↓
                                      ┌────────────────┐
                                      │  MetaMask UI   │
                                      │  "Connect?"    │
                                      └────────────────┘
                                              │
                            5. User approves
                                              ↓
                                      ┌────────────────┐
                                      │   DApp Page    │
                                      │  Connected!    │
                                      └────────────────┘
                                              │
                            6. Tap "Sign Login Message"
                                              ↓
                             7. GET /api/nonce
                                              ↓
                                      ┌────────────────┐
                                      │  Backend API   │
                                      │ Generate nonce │
                                      └────────────────┘
                                              │
                          8. Return { nonce, sessionId }
                                              ↓
                                      ┌────────────────┐
                                      │   DApp Page    │
                                      │ Call signMessage()
                                      └────────────────┘
                                              │
                      9. signer.signMessage("Login nonce: xxx")
                                              ↓
                                      ┌────────────────┐
                                      │  MetaMask UI   │
                                      │   "Sign?"      │
                                      └────────────────┘
                                              │
                            10. User signs
                                              ↓
                                      ┌────────────────┐
                                      │   DApp Page    │
                                      │ Got signature! │
                                      └────────────────┘
                                              │
         11. window.ReactNativeWebView.postMessage({
                type: 'login',
                address, signature, nonce, sessionId
            })
                                              ↓
                                      ┌────────────────┐
                                      │  WalletWebView │
                                      │   Component    │
                                      └────────────────┘
                                              │
                          12. POST /api/verify
                                              ↓
                                      ┌────────────────┐
                                      │  Backend API   │
                                      │ verifyMessage()│
                                      └────────────────┘
                                              │
                13. ethers.utils.verifyMessage(message, signature)
                                              ↓
                            14. Compare addresses
                                              ↓
                          15. Return { success: true }
                                              ↓
                                      ┌────────────────┐
                                      │  WalletWebView │
                                      │  Show Alert    │
                                      │ "Auth Success!"│
                                      └────────────────┘
```

### 2. Transaction Flow

```
┌──────────┐     1. Fill form &      ┌────────────────┐
│   User   │     tap "Send TX"       │   DApp Page    │
└──────────┘ ───────────────────────→│   (MetaMask    │
                                     │    Browser)    │
                                     └────────────────┘
                                              │
                2. Create transaction object
                   { to, value, data }
                                              ↓
                3. signer.sendTransaction(tx)
                                              ↓
                                      ┌────────────────┐
                                      │  MetaMask UI   │
                                      │  Show TX       │
                                      │  details       │
                                      └────────────────┘
                                              │
                            4. User approves
                                              ↓
                                      ┌────────────────┐
                                      │   MetaMask     │
                                      │  Signs TX      │
                                      │  Broadcasts    │
                                      └────────────────┘
                                              │
                                              ↓
                                      ┌────────────────┐
                                      │  Ethereum      │
                                      │  Network       │
                                      └────────────────┘
                                              │
                        5. Return tx hash
                                              ↓
                                      ┌────────────────┐
                                      │   DApp Page    │
                                      │ Got tx hash!   │
                                      └────────────────┘
                                              │
         6. window.ReactNativeWebView.postMessage({
                type: 'transactionSent',
                txHash, from, to, value
            })
                                              ↓
                                      ┌────────────────┐
                                      │  WalletWebView │
                                      │   Component    │
                                      └────────────────┘
                                              │
                            7. Show alert
                            "Transaction sent!"
                                              ↓
                  8. Wait for confirmation...
                                              ↓
                                      ┌────────────────┐
                                      │   DApp Page    │
                                      │ txResponse.wait()
                                      └────────────────┘
                                              │
                        9. TX confirmed!
                                              ↓
         10. window.ReactNativeWebView.postMessage({
                type: 'transactionConfirmed',
                txHash, blockNumber
            })
                                              ↓
                                      ┌────────────────┐
                                      │  WalletWebView │
                                      │   Component    │
                                      │ "TX Confirmed!"│
                                      └────────────────┘
```

## 🔌 Component Interaction Matrix

| Component | Communicates With | Method | Data Exchanged |
|-----------|------------------|---------|----------------|
| HomeScreen | WalletWebView | Props | Callbacks (onAuthenticated, onTransactionSent) |
| HomeScreen | MetaMask | Deep Link | DApp URL |
| WalletWebView | DApp Page | WebView | Renders HTML, receives postMessage |
| WalletWebView | Backend API | HTTP | Signature verification requests |
| DApp Page | MetaMask | window.ethereum | Wallet requests, signatures, transactions |
| DApp Page | Backend API | HTTP Fetch | Nonce requests, verification |
| DApp Page | React Native | postMessage | Events (login, txSent, etc.) |
| Backend API | Ethereum Network | JSON-RPC | Transaction broadcasting, queries |

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Security Layers                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Wallet Security                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Private keys never leave user's wallet             │   │
│  │ • MetaMask hardware-level encryption                 │   │
│  │ • User must approve every signature/transaction      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 2: Transport Security                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • HTTPS for all backend communications               │   │
│  │ • Secure WebView → React Native messaging            │   │
│  │ • CORS configured for allowed origins only           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 3: Authentication Security                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Unique nonce per authentication attempt            │   │
│  │ • Session-based nonce storage                        │   │
│  │ • Signature verification using ethers.js             │   │
│  │ • Nonce expiration (prevents replay attacks)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Layer 4: Backend Security                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Input validation on all endpoints                  │   │
│  │ • Rate limiting (prevents abuse)                     │   │ 
│  │ • Error handling without sensitive data leaks        │   │
│  │ • Comprehensive logging for audit trails             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📂 File Structure

```
walllet/
├── server/                           # Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── index.ts                 # Express server setup
│   │   └── routes/
│   │       ├── auth.ts              # Auth endpoints (/nonce, /verify)
│   │       └── tx.ts                # Transaction endpoints
│   ├── public/
│   │   └── index.html               # DApp page (ethers.js)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                         # React Native App
│   ├── app/
│   │   └── (tabs)/
│   │       └── index.tsx            # Home screen with wallet buttons
│   ├── components/
│   │   └── WalletWebView.tsx        # WebView component for DApp
│   ├── package.json
│   └── app.json
│
├── build.md                          # Original implementation plan
├── TESTING_GUIDE.md                  # Comprehensive testing guide
├── QUICK_START.md                    # Quick reference
├── IMPLEMENTATION_SUMMARY.md         # Complete implementation summary
├── DEPLOYMENT_CHECKLIST.md           # Production deployment guide
└── ARCHITECTURE.md                   # This file
```

## 🛠️ Technology Stack

### Backend
```
┌────────────────────────────────────┐
│         Backend Stack              │
├────────────────────────────────────┤
│ Runtime      │ Node.js            │
│ Language     │ TypeScript 5.x     │
│ Framework    │ Express 4.x        │
│ Crypto       │ ethers.js 5.7.2    │
│ CORS         │ cors 2.8.5         │
│ Body Parser  │ body-parser 1.20.2 │
└────────────────────────────────────┘
```

### DApp
```
┌────────────────────────────────────┐
│          DApp Stack                │
├────────────────────────────────────┤
│ Language     │ JavaScript (ES6+)  │
│ Library      │ ethers.js 5.7.2    │
│ Provider     │ window.ethereum    │
│ UI           │ Vanilla CSS        │
│ Messaging    │ postMessage API    │
└────────────────────────────────────┘
```

### Frontend
```
┌────────────────────────────────────┐
│        Frontend Stack              │
├────────────────────────────────────┤
│ Framework    │ React Native 0.81  │
│ Platform     │ Expo ~54           │
│ Language     │ TypeScript 5.x     │
│ WebView      │ react-native-webview│
│ Navigation   │ Expo Router        │
│ Linking      │ expo-linking       │
└────────────────────────────────────┘
```

## 🔄 State Management

### Backend State
- **Nonces**: In-memory Map (sessionId → nonce)
  - Temporary storage
  - Cleared after verification
  - Should be Redis/DB in production

### Frontend State
```typescript
// HomeScreen state
const [showWebView, setShowWebView] = useState(false);
const [authenticated, setAuthenticated] = useState(false);
const [userAddress, setUserAddress] = useState<string | null>(null);

// WalletWebView state
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### DApp State
```javascript
let provider = null;           // ethers.providers.Web3Provider
let signer = null;              // ethers.Signer
let currentAddress = null;      // User's Ethereum address
let currentNonce = null;        // Current nonce for auth
let currentSessionId = null;    // Session ID for auth
```

## 📡 API Specification

### GET /api/nonce
**Purpose**: Generate unique authentication nonce

**Response**:
```json
{
  "nonce": "0x1a2b3c4d5e6f...",
  "sessionId": "0x7g8h9i0j..."
}
```

### POST /api/verify
**Purpose**: Verify wallet signature

**Request**:
```json
{
  "address": "0x742d35Cc...",
  "signature": "0x12345...",
  "nonce": "0x1a2b3c...",
  "sessionId": "0x7g8h9i..."
}
```

**Response**:
```json
{
  "success": true,
  "address": "0x742d35Cc...",
  "message": "Authentication successful"
}
```

### POST /api/createTx
**Purpose**: Prepare transaction for signing

**Request**:
```json
{
  "to": "0x742d35Cc...",
  "value": "1000000000000000000",
  "data": "0x",
  "gasLimit": "21000"
}
```

**Response**:
```json
{
  "tx": {
    "to": "0x742d35Cc...",
    "value": "1000000000000000000",
    "data": "0x",
    "gasLimit": "21000",
    "gasPrice": "20000000000",
    "chainId": 1
  },
  "estimatedGas": "21000",
  "gasPrice": "20000000000"
}
```

### POST /api/broadcast
**Purpose**: Broadcast signed transaction

**Request**:
```json
{
  "rawTx": "0xf86c808504a817c800825208..."
}
```

**Response**:
```json
{
  "success": true,
  "txHash": "0xabc123...",
  "from": "0x742d35Cc...",
  "to": "0x123abc...",
  "value": "0.001"
}
```

## 🌐 Network Architecture

```
Mobile Device
    │
    ├─ React Native App (Port: Expo Dev Server)
    │       │
    │       └─ WebView (loads DApp)
    │               │
    │               └─ Communicates with Backend
    │
    └─ MetaMask App
            │
            └─ In-app Browser (loads DApp)
                    │
                    └─ Communicates with Backend

Backend Server (Port: 3000)
    │
    ├─ Express HTTP Server
    │       │
    │       ├─ /api/nonce
    │       ├─ /api/verify
    │       ├─ /api/createTx
    │       ├─ /api/broadcast
    │       └─ /api/tx/:hash
    │
    └─ Static Files
            │
            └─ /index.html (DApp Page)

Ethereum Network
    │
    └─ RPC Provider (Infura/Alchemy)
            │
            └─ Mainnet/Testnet Nodes
```

## 🔄 Message Flow (WebView ↔ React Native)

### From DApp to React Native
```javascript
// DApp sends message
window.ReactNativeWebView.postMessage(JSON.stringify({
  type: 'login',
  address: '0x...',
  signature: '0x...',
  nonce: '0x...',
  sessionId: '0x...'
}));
```

### React Native receives message
```typescript
// WalletWebView handles message
const handleMessage = (event: any) => {
  const data = JSON.parse(event.nativeEvent.data);
  switch (data.type) {
    case 'login': /* handle auth */ break;
    case 'transactionSent': /* handle tx */ break;
    // ... etc
  }
};
```

## 🎯 Design Patterns Used

1. **Repository Pattern**: Backend routes separated by domain
2. **Observer Pattern**: WebView message handling
3. **Factory Pattern**: ethers.js provider/signer creation
4. **Singleton Pattern**: Express app instance
5. **Callback Pattern**: React Native component props

## 📊 Performance Considerations

- **WebView Loading**: Cached HTML for faster loads
- **API Calls**: Parallel nonce fetch + sign operations
- **State Management**: Minimal re-renders with useState
- **Network**: Keep-alive connections to RPC provider
- **Logging**: Async logging to avoid blocking

## 🎓 Key Architectural Decisions

1. **No WalletConnect**: Simpler implementation using native wallet browsers
2. **In-memory Nonce Storage**: Simple for MVP, needs Redis for production
3. **WebView Communication**: Using postMessage instead of URL schemes
4. **Separate DApp Page**: Reusable across platforms (web, mobile)
5. **Backend Signature Verification**: Trust but verify on server
6. **TypeScript Throughout**: Type safety across all layers

---

**Architecture designed for**: Security, Simplicity, Scalability
