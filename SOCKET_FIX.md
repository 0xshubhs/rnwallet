# Socket.IO Connection Fix

## Problem Identified

The React Native app was not receiving the `session:connected` event from Socket.IO because **no clients were connected to the session room** when the event was emitted.

### Root Cause
- Socket.IO connection logic was duplicated in two places:
  1. `HomeScreen` (index.tsx) 
  2. `WalletWebView.tsx`
- This caused confusion about which component was responsible for the connection
- The WebView component was trying to connect, but it wasn't actually joining the room successfully

### Server Logs Showed
```
📣 [SOCKET] Emitting to 0 clients in session 0x5a47c0c7ed4c02b8
  Socket IDs in room: []
```

## Changes Made

### 1. **Server-side (`server/src/index.ts`)**
Enhanced Socket.IO connection handling with:
- Better logging to show transport type and auth data
- Async/await for room joins
- Verification of room membership after join
- Confirmation event (`joined`) sent back to clients
- Error handling for socket errors

```typescript
socket.on('join', async (sessionId: string) => {
  await socket.join(sessionId);
  
  // Verify the join
  const socketsInRoom = await io.in(sessionId).allSockets();
  console.log(`✅ [SOCKET] Client joined room: ${sessionId}`);
  console.log(`  Total clients in room: ${socketsInRoom.size}`);
  
  // Send confirmation
  socket.emit('joined', { sessionId, socketId: socket.id });
});
```

### 2. **Frontend (`WalletWebView.tsx`)**
- **Removed** Socket.IO connection logic entirely from this component
- Now only handles UI display (waiting screen) and WebView messages
- Socket.IO connection is centralized in `HomeScreen`

### 3. **HomeScreen (`app/(tabs)/index.tsx`)**
Already properly configured with:
- Session creation via `/api/session/new`
- Polling mechanism (primary - works with devtunnels)
- Socket.IO connection (secondary - backup method)
- Both methods listen for authentication completion

## How It Works Now

### Flow:
1. **User taps "🦊 Open in MetaMask Browser"**
2. **HomeScreen creates session**
   ```typescript
   POST /api/session/new
   → Returns: { sessionId, nonce }
   ```

3. **HomeScreen sets up TWO listeners:**
   - **Polling** (every 2s): `GET /api/session/${sessionId}`
   - **Socket.IO**: Connects and joins session room

4. **User authenticates in MetaMask browser**
   - MetaMask opens the DApp with `?sid=${sessionId}`
   - User connects wallet and signs message
   - MetaMask sends signature to backend

5. **Backend verifies signature**
   ```typescript
   POST /api/verify
   → Updates session.connected = true
   → Emits: io.to(sessionId).emit('session:connected', { sessionId, address })
   ```

6. **React Native receives notification**
   - Either via polling (checks session status) ✅
   - Or via Socket.IO event ✅
   - Shows "Wallet Connected" alert

## Testing Instructions

### 1. Restart the Server
```bash
cd server
npm run start
```

### 2. Rebuild the React Native App
Since we modified the Socket.IO logic:
```bash
cd frontend
npx expo run:ios --device
```

### 3. Test the Connection

1. Open the app on your device
2. Tap **"🦊 Open in MetaMask Browser"**
3. Watch the logs in both terminals:

**Expected Server Logs:**
```
🔌 [SOCKET] New client connected: abc123
  Transport: polling
📥 [SOCKET] Client abc123 joining session room: 0x...
✅ [SOCKET] Client joined room: 0x...
  Total clients in room: 1
  Socket IDs: ['abc123']
```

**Expected React Native Logs:**
```
✅ [RN] Socket connected: abc123
[RN] Joining session room: 0x...
✅ [RN] Confirmed join to room: 0x...
```

4. Switch to MetaMask and complete authentication
5. Watch for the event:

**Server:**
```
📤 [SOCKET] Emitting session:connected to room: 0x...
📣 [SOCKET] Emitting to 1 clients in session 0x...
  Socket IDs in room: ['abc123']
```

**React Native:**
```
✅ [RN] Wallet connected via socket: 0xf6Bd690bBDa2C723F36b44d9Eb3B4E5bD1D5476D
```

## Troubleshooting

### If Socket.IO Still Shows 0 Clients:

1. **Check if polling works first**
   - If polling detects the connection, Socket.IO is just a nice-to-have
   - DevTunnels sometimes block WebSocket upgrades

2. **Verify Socket.IO is connecting**
   ```typescript
   socket.on('connect', () => {
     console.log('✅ Socket connected:', socket.id);
   });
   ```

3. **Check for CORS errors**
   - Server already has `origin: '*'` but verify no errors in console

4. **Try forcing polling transport**
   In `app.config.ts`:
   ```typescript
   transports: ['polling', 'websocket']  // Polling first
   ```

### If Polling Works but Socket.IO Doesn't:
- This is OKAY! Polling is the primary method for devtunnels
- Socket.IO is a backup for local development
- In production with proper domains, Socket.IO will work better

## Why Two Methods?

- **Polling**: More reliable with proxies/tunnels (devtunnels, ngrok)
- **Socket.IO**: Better for real-time updates, lower latency
- Having both ensures the app works in all environments

## Next Steps

1. ✅ Test the fixed implementation
2. If Socket.IO still doesn't connect through devtunnels, that's expected
3. Verify polling is working (it should be!)
4. In production, consider upgrading transport priority for Socket.IO

## Summary

The fix centralizes Socket.IO connection management in `HomeScreen` and improves server-side room handling. Combined with the existing polling mechanism, this ensures reliable wallet connection notifications regardless of network conditions.
