// frontend/src/provider/LocalUniversalProvider.ts
import { ethers, Wallet } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const SECURE_KEY_NAME = 'rnwallet-privateKey';

export type JsonRpcRequest = {
  method: string;
  params?: any[];
};

export class LocalUniversalProvider {
  private wallet: Wallet | null = null;
  private rpcProvider: ethers.JsonRpcProvider | null = null;

  constructor(rpcUrl: string) {
    this.rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
  }

  // Initialize / load local wallet
  async init(): Promise<string> {
    let pk = await SecureStore.getItemAsync(SECURE_KEY_NAME);

    if (!pk) {
      // Generate random 32 bytes for private key using expo-crypto
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const hexBytes = Array.from(randomBytes)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
      pk = '0x' + hexBytes;
      await SecureStore.setItemAsync(SECURE_KEY_NAME, pk);
    }

    this.wallet = new ethers.Wallet(pk!, this.rpcProvider!);
    return this.wallet.address;
  }

  getAddress(): string {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return this.wallet.address;
  }

  // Universal "request" interface similar to WalletConnect/AppKit
  async request<T = any>({ method, params = [] }: JsonRpcRequest): Promise<T> {
    if (!this.wallet || !this.rpcProvider) {
      throw new Error('Provider not initialized');
    }

    switch (method) {
      case 'personal_sign': {
        // params: [message, address]
        const [message] = params;
        const signature = await this.wallet.signMessage(message);
        return signature as T;
      }

      case 'eth_sendTransaction': {
        const [tx] = params;
        // tx = { to, value, data, gasLimit, ... }
        const response = await this.wallet.sendTransaction({
          to: tx.to,
          value: tx.value ? ethers.toBigInt(tx.value) : undefined,
          data: tx.data,
          gasLimit: tx.gasLimit ? ethers.toBigInt(tx.gasLimit) : undefined,
        });
        return response.hash as T;
      }

      case 'eth_signTypedData':
      case 'eth_signTypedData_v4': {
        const [, typedData] = params;
        // For POC, we can cheat and do personal_sign over JSON string
        const message = typeof typedData === 'string' ? typedData : JSON.stringify(typedData);
        const signature = await this.wallet.signMessage(message);
        return signature as T;
      }

      case 'eth_getBalance': {
        const [address, blockTag] = params;
        const balance = await this.rpcProvider.getBalance(address, blockTag);
        return balance.toString() as T;
      }

      default: {
        // Fallback to raw JSON-RPC on rpcProvider
        // Example: { method: "eth_blockNumber", params: [] }
        const result = await this.rpcProvider.send(method, params);
        return result as T;
      }
    }
  }
}
