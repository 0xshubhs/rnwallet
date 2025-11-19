import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface WalletWebViewProps {
  dappUrl: string;
  onAuthenticated?: (address: string) => void;
  onTransactionSent?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export default function WalletWebView({
  dappUrl,
  onAuthenticated,
  onTransactionSent,
  onError
}: WalletWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Received message from WebView:', data);

      switch (data.type) {
        case 'connected':
          Alert.alert('Wallet Connected', `Address: ${data.address.substring(0, 10)}...`);
          break;

        case 'login':
          // Handle authentication
          verifySignature(data);
          break;

        case 'transactionSent':
          Alert.alert(
            'Transaction Sent',
            `Transaction Hash: ${data.txHash.substring(0, 10)}...`
          );
          onTransactionSent?.(data.txHash);
          break;

        case 'transactionConfirmed':
          Alert.alert(
            'Transaction Confirmed',
            `Block: ${data.blockNumber}\nHash: ${data.txHash.substring(0, 10)}...`
          );
          break;

        case 'accountChanged':
          Alert.alert('Account Changed', `New address: ${data.address.substring(0, 10)}...`);
          break;

        case 'disconnected':
          Alert.alert('Wallet Disconnected', 'Your wallet has been disconnected.');
          break;

        case 'error':
          Alert.alert('Error', data.error);
          onError?.(data.error);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err);
      setError('Failed to parse message from wallet');
    }
  };

  const verifySignature = async (data: any) => {
    try {
      const { address, signature, nonce, sessionId } = data;

      // Send to backend for verification
      const response = await fetch(`${dappUrl.replace(/\/[^/]*$/, '')}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          signature,
          nonce,
          sessionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Authentication Successful', `Welcome! Address: ${address.substring(0, 10)}...`);
        onAuthenticated?.(address);
      } else {
        Alert.alert('Authentication Failed', result.error || 'Invalid signature');
        onError?.(result.error || 'Invalid signature');
      }
    } catch (err: any) {
      console.error('Error verifying signature:', err);
      Alert.alert('Verification Error', err.message);
      onError?.(err.message);
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError('Failed to load DApp');
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading Wallet...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: dappUrl }}
        onMessage={handleMessage}
        onError={handleError}
        onLoad={handleLoad}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#721c24',
    textAlign: 'center',
  },
});
