import type { Network } from "@coinbase/agentkit";
import { WalletProvider } from "@coinbase/agentkit";

export class AgentKitWalletProvider extends WalletProvider {
  constructor() {
    super();
  }

  getAddress(): string {
    return "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  }

  getNetwork(): Network {
    return {
      networkId: "mainnet",
        chainId: "1",
      protocolFamily: "ethereum",
    };
  }

  getName(): string {
    return "AgentKitWalletProvider";
  }

  getBalance(): Promise<bigint> {
    return Promise.resolve(BigInt(0));
  }

  nativeTransfer(to: string, value: string): Promise<string> {
    return Promise.resolve("0x");
  }
}
