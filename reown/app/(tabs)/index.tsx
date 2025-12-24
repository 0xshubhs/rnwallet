import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Alert, TextInput } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MultichainAssets } from '@/components/multichain-assets';
import { SendFunds } from '@/components/send-funds';
import { AppKit, useAccount, useAppKit, useProvider } from '@reown/appkit-react-native';
import { BrowserProvider, formatEther } from 'ethers';

export default function HomeScreen() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { provider } = useProvider();
  const [balance, setBalance] = useState<string | null>(null);
  const [sendFundsVisible, setSendFundsVisible] = useState(false);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [messageToSign, setMessageToSign] = useState('Hello from Meow Wallet!');
  const [signature, setSignature] = useState<string | null>(null);

  // Fetch balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (!isConnected || !address || !provider) {
        setBalance(null);
        return;
      }

      try {
        const ethersProvider = new BrowserProvider(provider as any);
        const balanceWei = await ethersProvider.getBalance(address);
        const balanceEth = formatEther(balanceWei);
        setBalance(parseFloat(balanceEth).toFixed(4));
        
        // Get chain ID from provider
        const network = await ethersProvider.getNetwork();
        setChainId(Number(network.chainId));
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    fetchBalance();
  }, [isConnected, address, provider]);

  const handleDisconnect = async () => {
    // Open the modal to show disconnect option
    open();
  };

  const handleSignMessage = async () => {
    if (!provider || !address) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    try {
      const ethersProvider = new BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      
      // Sign the message - this will prompt MetaMask/wallet for approval
      const signedMessage = await signer.signMessage(messageToSign);
      
      setSignature(signedMessage);
      Alert.alert(
        'Message Signed!',
        `Signature: ${signedMessage.slice(0, 20)}...${signedMessage.slice(-20)}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error signing message:', error);
      Alert.alert('Error', error.message || 'Failed to sign message');
    }
  };

  const handleSignTypedData = async () => {
    if (!provider || !address) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    try {
      const ethersProvider = new BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      
      // Example EIP-712 typed data
      const domain = {
        name: 'Meow Wallet',
        version: '1',
        chainId: chainId,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
      };

      const types = {
        Mail: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'contents', type: 'string' }
        ]
      };

      const value = {
        from: address,
        to: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        contents: 'Hello from Meow Wallet with EIP-712!'
      };

      // Sign typed data - this will prompt wallet for approval
      const signedTypedData = await signer.signTypedData(domain, types, value);
      
      setSignature(signedTypedData);
      Alert.alert(
        'Typed Data Signed!',
        `Signature: ${signedTypedData.slice(0, 20)}...${signedTypedData.slice(-20)}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error signing typed data:', error);
      Alert.alert('Error', error.message || 'Failed to sign typed data');
    }
  };

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.reactLogo}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Meow Wallet</ThemedText>
          <HelloWave />
        </ThemedView>

        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Web3 Wallet Connection</ThemedText>
          
          {isConnected ? (
            <View style={styles.walletInfo}>
              <ThemedText type="defaultSemiBold">Connected Wallet</ThemedText>
              <ThemedText style={styles.address}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </ThemedText>
              
              {balance && (
                <ThemedText style={styles.balance}>
                  Current Network Balance: {balance} ETH
                </ThemedText>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.sendButton}
                  onPress={() => {
                    console.log('Send button pressed');
                    console.log('Provider:', !!provider);
                    console.log('Address:', address);
                    console.log('ChainId:', chainId);
                    setSendFundsVisible(true);
                  }}
                >
                  <ThemedText style={styles.buttonText}>💸 Send</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.signButton}
                  onPress={() => setSignModalVisible(true)}
                >
                  <ThemedText style={styles.buttonText}>✍️ Sign</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.disconnectButton}
                  onPress={handleDisconnect}
                >
                  <ThemedText style={styles.buttonText}>⚙️</ThemedText>
                </TouchableOpacity>
              </View>
              
              {/* Sign Message Section */}
              {signModalVisible && (
                <View style={styles.signContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.signTitle}>
                    Sign Message
                  </ThemedText>
                  
                  <TextInput
                    style={styles.messageInput}
                    value={messageToSign}
                    onChangeText={setMessageToSign}
                    placeholder="Enter message to sign"
                    placeholderTextColor="#999"
                    multiline
                  />
                  
                  <View style={styles.signButtonRow}>
                    <TouchableOpacity 
                      style={styles.signActionButton}
                      onPress={handleSignMessage}
                    >
                      <ThemedText style={styles.buttonText}>
                        Sign Message
                      </ThemedText>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.signTypedButton}
                      onPress={handleSignTypedData}
                    >
                      <ThemedText style={styles.buttonText}>
                        Sign Typed Data
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  
                  {signature && (
                    <View style={styles.signatureContainer}>
                      <ThemedText type="defaultSemiBold">Last Signature:</ThemedText>
                      <ThemedText style={styles.signatureText}>
                        {signature.slice(0, 30)}...{signature.slice(-30)}
                      </ThemedText>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.closeSignButton}
                    onPress={() => setSignModalVisible(false)}
                  >
                    <ThemedText style={styles.buttonText}>Close</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.connectContainer}>
              <ThemedText style={styles.description}>
                Connect your wallet to access Web3 features. Supports MetaMask, Trust Wallet, and more.
              </ThemedText>
              
              <TouchableOpacity 
                style={styles.connectButton}
                onPress={() => open()}
              >
                <ThemedText style={styles.buttonText}>Connect Wallet</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>

        {/* Multichain Assets View */}
        {isConnected && address && (
          <ThemedView style={styles.multichainContainer}>
            <MultichainAssets />
          </ThemedView>
        )}

        <ThemedView style={styles.stepContainer}>
          <ThemedText type="subtitle">Supported Networks</ThemedText>
          <ThemedText>
            Mainnets:{'\n'}
            • Ethereum • Polygon • Arbitrum • Optimism • Base • BSC • Avalanche{'\n\n'}
            Testnets:{'\n'}
            • Sepolia • Polygon Amoy • Arbitrum Sepolia • Optimism Sepolia • Base Sepolia
          </ThemedText>
        </ThemedView>

        
      </ParallaxScrollView>

      {/* Send Funds Modal - Always render when connected */}
      {isConnected && address && provider ? (
        <SendFunds
          visible={sendFundsVisible}
          onClose={() => {
            console.log('Closing send funds modal');
            setSendFundsVisible(false);
          }}
          provider={provider}
          address={address}
          currentChainId={chainId}
        />
      ) : (
        sendFundsVisible && console.log('Cannot show SendFunds: ', { isConnected, address: !!address, provider: !!provider })
      )}

      {/* AppKit Modal - positioned absolutely for Expo Router compatibility */}
      <View style={styles.modalContainer}>
        <AppKit />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  connectContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  description: {
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  signButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  walletInfo: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  address: {
    fontSize: 16,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  balance: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  multichainContainer: {
    minHeight: 400,
    marginVertical: 16,
  },
  modalContainer: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    pointerEvents: 'box-none',
  },
  signContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    gap: 12,
  },
  signTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  signButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  signActionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signTypedButton: {
    flex: 1,
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signatureContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  signatureText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  closeSignButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
});
