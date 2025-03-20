import { ToolBase, WalletClientBase } from "@goat-sdk/core";

// Create a concrete implementation of WalletClientBase
class SimpleWallet extends WalletClientBase {
    private address: string;
    private chainId: string;

    constructor(address: string, chainId: string) {
        super();
        this.address = address;
        this.chainId = chainId;
    }

    getAddress(): string {
        return this.address;
    }

    getChain() {
        return { id: this.chainId } as any;
    }

    async signMessage(message: string): Promise<{ signature: string, transactionURL: string }> {
        // Mock implementation
        return { signature: `signed-${message}`, transactionURL: `https://example.com/transaction/${message}` };
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
            symbol: "ETH",
            name: "Ethereum",
            value: "0",
            inBaseUnits: "0"
        };
    }

    getCoreTools(): ToolBase[] {
        return [];
    }
}

export const wallet = new SimpleWallet(
    "0x0000000000000000000000000000000000000000",
    "base"
); 