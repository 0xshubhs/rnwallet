import { useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Modal, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  View,
  useColorScheme 
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrowserProvider, parseEther, formatEther } from 'ethers';
import { 
  mainnet, 
  sepolia, 
  polygon, 
  polygonAmoy, 
  arbitrum, 
  arbitrumSepolia, 
  optimism, 
  optimismSepolia, 
  base, 
  baseSepolia, 
  bsc, 
  avalanche 
} from 'viem/chains';

interface SendFundsProps {
  visible: boolean;
  onClose: () => void;
  provider: any;
  address: string;
  currentChainId?: number;
}

const chains = [
  mainnet, sepolia, polygon, polygonAmoy, 
  arbitrum, arbitrumSepolia, optimism, optimismSepolia, 
  base, baseSepolia, bsc, avalanche
];

export function SendFunds({ visible, onClose, provider, address, currentChainId }: SendFundsProps) {
  const colorScheme = useColorScheme();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState(currentChainId || mainnet.id);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [balance, setBalance] = useState<string | null>(null);

  const selectedChainData = chains.find(c => c.id === selectedChain);

  useEffect(() => {
    if (visible) {
      fetchBalance();
      setSelectedChain(currentChainId || mainnet.id);
    }
  }, [visible, currentChainId]);

  const fetchBalance = async () => {
    if (!provider || !address) return;
    
    try {
      const ethersProvider = new BrowserProvider(provider);
      const balanceWei = await ethersProvider.getBalance(address);
      const balanceEth = formatEther(balanceWei);
      setBalance(parseFloat(balanceEth).toFixed(6));
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
    }
  };

  const validateAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  const validateAmount = (amt: string): boolean => {
    const num = parseFloat(amt);
    return !isNaN(num) && num > 0;
  };

  const handleSend = async () => {
    // Validation
    if (!validateAddress(recipientAddress)) {
      Alert.alert('Invalid Address', 'Please enter a valid recipient address');
      setErrorMessage('Invalid recipient address');
      return;
    }

    if (!validateAmount(amount)) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      setErrorMessage('Invalid amount');
      return;
    }

    if (!provider) {
      Alert.alert('Error', 'Wallet provider not connected');
      setErrorMessage('Provider not connected');
      return;
    }

    try {
      setLoading(true);
      setTxStatus('signing');
      setErrorMessage('');

      console.log('Creating ethers provider...');
      const ethersProvider = new BrowserProvider(provider);
      
      console.log('Getting signer...');
      const signer = await ethersProvider.getSigner();

      // Check balance
      console.log('Checking balance...');
      const balanceWei = await ethersProvider.getBalance(address);
      const amountWei = parseEther(amount);

      console.log('Balance:', formatEther(balanceWei), 'Amount:', amount);

      if (balanceWei < amountWei) {
        throw new Error('Insufficient balance');
      }

      // Estimate gas
      const gasEstimate = await ethersProvider.estimateGas({
        to: recipientAddress,
        value: amountWei,
        from: address,
      });

      const feeData = await ethersProvider.getFeeData();
      const estimatedGasCost = gasEstimate * (feeData.gasPrice || BigInt(0));
      const totalRequired = amountWei + estimatedGasCost;

      if (balanceWei < totalRequired) {
        throw new Error('Insufficient balance for transaction + gas fees');
      }

      // Prepare transaction
      console.log('Preparing transaction...');
      const tx = {
        to: recipientAddress,
        value: amountWei,
      };

      setTxStatus('sending');
      
      console.log('Sending transaction...');
      // Send transaction
      const transaction = await signer.sendTransaction(tx);
      setTxHash(transaction.hash);
      
      console.log('Transaction sent, hash:', transaction.hash);
      console.log('Waiting for confirmation...');

      // Wait for confirmation
      const receipt = await transaction.wait();
      console.log('Transaction confirmed!', receipt);

      setTxStatus('success');
      
      // Show success and redirect after 3 seconds
      Alert.alert(
        'Success!',
        `Transaction confirmed!\nHash: ${transaction.hash.slice(0, 10)}...${transaction.hash.slice(-8)}`,
        [{ text: 'OK' }]
      );
      
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (error: any) {
      console.error('Transaction error:', error);
      setTxStatus('error');
      
      let errorMsg = 'Transaction failed';
      
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMsg = 'Transaction rejected by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient funds for transaction + gas';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      Alert.alert('Transaction Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRecipientAddress('');
    setAmount('');
    setTxHash(null);
    setTxStatus('idle');
    setErrorMessage('');
    setBalance(null);
    onClose();
  };

  const setMaxAmount = () => {
    if (balance) {
      // Reserve some for gas
      const maxAmount = Math.max(0, parseFloat(balance) - 0.001);
      setAmount(maxAmount.toFixed(6));
    }
  };

  const getChainColor = (chainId: number): string => {
    const chainName = chains.find(c => c.id === chainId)?.name || '';
    const colors: { [key: string]: string } = {
      'Ethereum': '#627EEA',
      'Sepolia': '#627EEA',
      'Polygon': '#8247E5',
      'Polygon Amoy': '#8247E5',
      'Arbitrum': '#28A0F0',
      'Arbitrum Sepolia': '#28A0F0',
      'Optimism': '#FF0420',
      'OP Sepolia': '#FF0420',
      'Base': '#0052FF',
      'Base Sepolia': '#0052FF',
      'BNB Smart Chain': '#F3BA2F',
      'Avalanche': '#E84142',
    };
    return colors[chainName] || '#007AFF';
  };

  const renderStatusView = () => {
    if (txStatus === 'signing') {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.statusText}>Waiting for signature...</ThemedText>
          <ThemedText style={styles.statusSubtext}>
            Please sign the transaction in your wallet
          </ThemedText>
        </View>
      );
    }

    if (txStatus === 'sending') {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.statusText}>Sending transaction...</ThemedText>
          {txHash && (
            <ThemedText style={styles.txHash}>
              TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </ThemedText>
          )}
        </View>
      );
    }

    if (txStatus === 'success') {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.successIcon}>
            <ThemedText style={styles.successIconText}>✓</ThemedText>
          </View>
          <ThemedText style={styles.successText}>Transaction Successful!</ThemedText>
          {txHash && (
            <>
              <ThemedText style={styles.txHash}>
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </ThemedText>
              <ThemedText style={styles.redirectText}>
                Redirecting in 3 seconds...
              </ThemedText>
            </>
          )}
        </View>
      );
    }

    if (txStatus === 'error') {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.errorIcon}>
            <ThemedText style={styles.errorIconText}>✕</ThemedText>
          </View>
          <ThemedText style={styles.errorText}>Transaction Failed</ThemedText>
          <ThemedText style={styles.errorMessageText}>{errorMessage}</ThemedText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => setTxStatus('idle')}
          >
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onShow={fetchBalance}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Send Funds</ThemedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          {txStatus !== 'idle' ? (
            renderStatusView()
          ) : (
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              {/* Chain Selection */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Network</ThemedText>
                <View style={styles.chainSelector}>
                  <View 
                    style={[
                      styles.chainIndicator, 
                      { backgroundColor: getChainColor(selectedChain) }
                    ]} 
                  />
                  <ThemedText style={styles.chainText}>
                    {selectedChainData?.name || 'Select Chain'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.helperText}>
                  Currently connected to {selectedChainData?.name}
                </ThemedText>
              </View>

              {/* Balance Display */}
              {balance && (
                <View style={styles.balanceContainer}>
                  <ThemedText style={styles.balanceLabel}>Available Balance:</ThemedText>
                  <ThemedText style={styles.balanceAmount}>
                    {balance} {selectedChainData?.nativeCurrency.symbol}
                  </ThemedText>
                </View>
              )}

              {/* Recipient Address */}
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Recipient Address</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="0x..."
                  placeholderTextColor="#999"
                  value={recipientAddress}
                  onChangeText={setRecipientAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {recipientAddress && !validateAddress(recipientAddress) && (
                  <ThemedText style={styles.errorHelperText}>
                    Invalid address format
                  </ThemedText>
                )}
              </View>

              {/* Amount */}
              <View style={styles.formGroup}>
                <View style={styles.amountHeader}>
                  <ThemedText style={styles.label}>Amount</ThemedText>
                  <TouchableOpacity onPress={setMaxAmount}>
                    <ThemedText style={styles.maxButton}>MAX</ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.0"
                    placeholderTextColor="#999"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                  <ThemedText style={styles.currencySymbol}>
                    {selectedChainData?.nativeCurrency.symbol}
                  </ThemedText>
                </View>
              </View>

              {/* Error Message */}
              {errorMessage && (
                <View style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                </View>
              )}

              {/* Send Button */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (loading || !validateAddress(recipientAddress) || !validateAmount(amount)) && 
                  styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={loading || !validateAddress(recipientAddress) || !validateAmount(amount)}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.sendButtonText}>
                    Send {amount || '0'} {selectedChainData?.nativeCurrency.symbol}
                  </ThemedText>
                )}
              </TouchableOpacity>

              {/* Transaction Info */}
              <View style={styles.infoContainer}>
                <ThemedText style={styles.infoText}>
                  ⓘ You will be asked to sign this transaction in your wallet
                </ThemedText>
              </View>
            </ScrollView>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  helperText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  errorHelperText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  chainSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  chainIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  chainText: {
    fontSize: 16,
    fontWeight: '500',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  maxButton: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.6,
    marginLeft: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
  txHash: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.6,
    marginTop: 12,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconText: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  successText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#34C759',
    marginTop: 16,
  },
  redirectText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 16,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconText: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  errorMessageText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
