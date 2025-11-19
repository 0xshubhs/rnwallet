import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Linking, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import WalletWebView from '@/components/WalletWebView';

// Configure your backend URL from environment variable
const BACKEND_URL =  'https://2qpfn6bb-3001.inc1.devtunnels.ms';
const DAPP_URL = `${BACKEND_URL}/index.html`;

export default function HomeScreen() {
  const [showWebView, setShowWebView] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  const handleConnectWallet = () => {
    Alert.alert(
      '⚠️ Limited Functionality',
      'The embedded browser cannot detect MetaMask or other wallets. For full wallet support, please use "🦊 Open in MetaMask Browser" button instead.\n\nDo you want to continue anyway?',
      [
        {
          text: 'Use MetaMask Browser',
          onPress: handleConnectMetaMask,
          style: 'default'
        },
        {
          text: 'Continue Anyway',
          onPress: () => setShowWebView(true),
          style: 'cancel'
        }
      ]
    );
  };

  const handleConnectMetaMask = async () => {
    try {
      // MetaMask deep link - use the URL without protocol for better compatibility
      const urlWithoutProtocol = DAPP_URL.replace(/^https?:\/\//, '');
      const metaMaskDeepLink = `https://metamask.app.link/dapp/${urlWithoutProtocol}`;
      
      // Alternative: Direct browser link (fallback)
      const directLink = `metamask://dapp/${urlWithoutProtocol}`;
      
      Alert.alert(
        'Open in MetaMask Browser',
        `URL: ${DAPP_URL}\n\nNote: MetaMask requires HTTPS for remote connections. For local testing with HTTP, you may need to use a tunneling service like ngrok.`,
        [
          {
            text: 'Try MetaMask Link',
            onPress: async () => {
              try {
                console.log('Opening MetaMask with:', metaMaskDeepLink);
                await Linking.openURL(metaMaskDeepLink);
              } catch (err) {
                console.error('Failed with app link, trying direct:', err);
                try {
                  await Linking.openURL(directLink);
                } catch {
                  Alert.alert(
                    'MetaMask Not Installed',
                    'Please install MetaMask mobile app from your app store.',
                    [{ text: 'OK' }]
                  );
                }
              }
            }
          },
          {
            text: 'Try Embedded Browser',
            onPress: () => {
              Alert.alert(
                'Limited Functionality',
                'The embedded browser may not detect your wallet. For best experience, use "Open in MetaMask" option.',
                [
                  { text: 'Continue Anyway', onPress: () => setShowWebView(true) },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error opening MetaMask:', error);
      Alert.alert('Error', 'Failed to open MetaMask.');
    }
  };

  const handleAuthenticated = (address: string) => {
    setAuthenticated(true);
    setUserAddress(address);
  };

  const handleTransactionSent = (txHash: string) => {
    console.log('Transaction sent:', txHash);
  };

  const handleError = (error: string) => {
    console.error('Wallet error:', error);
  };

  const handleDisconnect = () => {
    setShowWebView(false);
    setAuthenticated(false);
    setUserAddress(null);
  };

  if (showWebView) {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDisconnect} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          {authenticated && userAddress && (
            <Text style={styles.addressText}>
              {userAddress.substring(0, 6)}...{userAddress.substring(userAddress.length - 4)}
            </Text>
          )}
        </View>
        <WalletWebView
          dappUrl={DAPP_URL}
          onAuthenticated={handleAuthenticated}
          onTransactionSent={handleTransactionSent}
          onError={handleError}
        />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          🦊 Ethereum Wallet
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Connect your wallet to access blockchain features
        </ThemedText>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleConnectMetaMask}
          >
            <Text style={styles.primaryButtonText}>🦊 Open in MetaMask Browser</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleConnectWallet}
          >
            <Text style={styles.secondaryButtonText}>Try Embedded Browser (Limited)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <ThemedText type="subtitle" style={styles.infoTitle}>
            ⚠️ HTTPS Required for MetaMask:
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • MetaMask requires HTTPS for security
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • Current backend: {BACKEND_URL}
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • For production, use a proper domain with SSL
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • For testing, use ngrok to create HTTPS tunnel
          </ThemedText>
        </View>

        <View style={styles.featuresContainer}>
          <ThemedText type="subtitle" style={styles.infoTitle}>
            Features:
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • Connect Ethereum wallet securely
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • Sign messages for authentication
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • Send Ethereum transactions
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • Real-time transaction tracking
          </ThemedText>
        </View>

        <View style={styles.noteContainer}>
          <ThemedText style={styles.noteText}>
            Backend: {BACKEND_URL}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#667eea',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  featuresContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  noteContainer: {
    padding: 16,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  noteText: {
    fontSize: 12,
    opacity: 0.8,
  },
});
