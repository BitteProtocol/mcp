import { type Chain, type ToolBase, WalletClientBase } from '@goat-sdk/core';
import { mainnet } from 'viem/chains';

// Create a concrete implementation of WalletClientBase
class SimpleWallet extends WalletClientBase {
  private address: string;
  private chainId: number;

  constructor(address: string, chainId: number) {
    super();
    this.address = address;
    this.chainId = chainId;
  }

  getAddress(): string {
    return this.address;
  }

  getChain() {
    // Use the original any type since we don't have access to the Chain type definition
    // and this is a mock implementation for development purposes
    return { id: this.chainId } as Chain;
  }

  async signMessage(message: string): Promise<{ signature: string; transactionURL: string }> {
    // Mock implementation
    return {
      signature: `signed-${message}`,
      transactionURL: `https://example.com/transaction/${message}`,
    };
  }

  async balanceOf(address: string): Promise<{
    decimals: number;
    symbol: string;
    name: string;
    value: string;
    inBaseUnits: string;
  }> {
    // Mock implementation
    return {
      decimals: 18,
      symbol: 'ETH',
      name: 'Ethereum',
      value: '0',
      inBaseUnits: '0',
    };
  }

  getCoreTools(): ToolBase[] {
    return [];
  }
}

export const wallet = new SimpleWallet('0x742d35Cc6634C0532925a3b844Bc454e4438f44e', mainnet.id);
