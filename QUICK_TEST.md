# 🚀 Quick Test Commands

## Test Deep Link from Terminal

### iOS Simulator
```bash
xcrun simctl openurl booted "myapp://connected?action=connect&sid=0x1234567890abcdef&address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
```

### Android Emulator/Device
```bash
adb shell am start -W -a android.intent.action.VIEW -d "myapp://connected?action=connect&sid=0x1234567890abcdef&address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
```

---

## Test Page URL

Open in your device browser or MetaMask browser:
```
https://2qpfn6bb-3000.inc1.devtunnels.ms/test-deeplink.html
```

---

## Rebuild After Config Changes

If you modified `app.json`, `AndroidManifest.xml`, or `Info.plist`:

```bash
cd frontend

# Clean and rebuild
npx expo prebuild --clean

# Run on iOS
npx expo run:ios

# OR run on Android  
npx expo run:android
```

---

## Check Logs

### React Native Metro Logs
```bash
cd frontend
npx expo start
# Watch for deep link logs starting with [DeepLink]
```

### iOS Native Logs
```bash
xcrun simctl spawn booted log stream --predicate 'process == "frontend"' | grep -i "deeplink\|myapp"
```

### Android Logs
```bash
adb logcat | grep -i "myapp\|deeplink\|intent"
```

---

## Verify Configuration

### Check app.json
```bash
grep -A 2 '"scheme"' frontend/app.json
# Should show: "scheme": "myapp"
```

### Check iOS Info.plist
```bash
grep -A 5 "CFBundleURLSchemes" frontend/ios/frontend/Info.plist
# Should include: <string>myapp</string>
```

### Check Android Manifest
```bash
grep -A 3 'android:scheme="myapp"' frontend/android/app/src/main/AndroidManifest.xml
# Should exist in an intent-filter
```

---

## Test Different Deep Link Scenarios

### 1. Connect Flow (with action)
```
myapp://connected?action=connect&sid=0x1234567890abcdef&address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

### 2. Session Only (no action)
```
myapp://connected?sid=0x1234567890abcdef&address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
```

### 3. Transaction
```
myapp://transaction?txHash=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### 4. Error
```
myapp://connected?error=User+rejected+request
```

---

## Expected Console Output

When a deep link is received successfully:

```
✅ [RootLayout] 🚀 Initializing deep link service...
✅ [DeepLink] 🚀 Initializing service...
✅ [DeepLink] 📲 Deep link received: myapp://connected?...
✅ [DeepLink] 🔍 Processing link (warm-start): myapp://...
✅ [DeepLink] 📋 Parsed: { "scheme": "myapp", "host": "connected", ... }
✅ [DeepLink] 📢 Emitting "link" to X listener(s)
✅ [DeepLink] 📤 Emitting action event: "connect"
✅ [DeepLink] 📤 Emitting session event with sid: 0x...
✅ [HomeScreen] 🎉 Wallet connection deep link received
✅ [HomeScreen] ✅ Session ID received: 0x...
```

---

## Troubleshooting

### Problem: Deep link doesn't open app
- **Solution 1**: Rebuild app after config changes
- **Solution 2**: Check scheme is registered in both iOS and Android
- **Solution 3**: Test with terminal command instead of browser

### Problem: App opens but no alert/action
- **Solution 1**: Check console for parsing/validation errors
- **Solution 2**: Ensure listeners are registered (should see 🎧 in logs)
- **Solution 3**: Verify URL parameters match expected format

### Problem: MetaMask redirect doesn't work
- **Solution 1**: Use the manual "Return to App" button (now included)
- **Solution 2**: Manually switch to app using iOS/Android multitasking
- **Solution 3**: Use Socket.IO as primary method (already working!)

---

## 📞 Quick Reference

| What | Where |
|------|-------|
| Test page | `/server/public/test-deeplink.html` |
| Deep link service | `/frontend/services/deeplink.service.ts` |
| Configuration | `/frontend/config/app.config.ts` |
| iOS config | `/frontend/ios/frontend/Info.plist` |
| Android config | `/frontend/android/app/src/main/AndroidManifest.xml` |
| Full guide | `/DEEPLINK_FIX.md` |
