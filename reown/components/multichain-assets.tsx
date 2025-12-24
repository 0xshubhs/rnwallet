import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrowserProvider, formatEther } from 'ethers';
import { useAccount, useProvider } from '@reown/appkit-react-native';

export function MultichainAssets() {
  const [totalBalance, setTotalBalance] = useState<string>('0');
  const { address, isConnected } = useAccount();
  const { provider } = useProvider();

  useEffect(() => {
    const fetchBalance = async () => {
      if (!isConnected || !address || !provider) {
        setTotalBalance('0');
        return;
      }

      try {
        const ethersProvider = new BrowserProvider(provider as any);
        const balanceWei = await ethersProvider.getBalance(address);
        const balanceEth = formatEther(balanceWei);
        setTotalBalance(parseFloat(balanceEth).toFixed(6));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setTotalBalance('0');
      }
    };

    fetchBalance();
  }, [address, provider, isConnected]);

  if (!isConnected || !address) {
    return null;
  }

  const balanceNum = parseFloat(totalBalance);
  
  if (balanceNum === 0) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Total Balance</ThemedText>
      <ThemedText style={styles.balanceAmount}>
        {totalBalance} ETH
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
});
