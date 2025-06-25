import type { IAgentRuntime, Provider, Memory, State } from "@elizaos/core";
import { initSwellWalletProvider, WalletProvider as SwellWalletProvider } from "./wallet";
import { initEthereumWalletProvider, EthereumWalletProvider } from "./ethWallet";

export class MultiNetworkWalletProvider {
    ethereumWallet: EthereumWalletProvider;
    swellWallet: SwellWalletProvider;
    
    constructor(ethereumWallet: EthereumWalletProvider, swellWallet: SwellWalletProvider) {
        this.ethereumWallet = ethereumWallet;
        this.swellWallet = swellWallet;
    }
    
    getEthereumAddress(): string {
        return this.ethereumWallet.getAddress();
    }
    
    getSwellAddress(): string {
        return this.swellWallet.getAddress();
    }
    
    async getEthereumBalance(): Promise<string> {
        return await this.ethereumWallet.getBalance();
    }
    
    async getSwellBalance(): Promise<string> {
        return await this.swellWallet.getBalance();
    }
}

export const initMultiNetworkWalletProvider = async (runtime: IAgentRuntime) => {
    const ethereumWallet = await initEthereumWalletProvider(runtime);
    const swellWallet = await initSwellWalletProvider(runtime);
    
    return new MultiNetworkWalletProvider(ethereumWallet, swellWallet);
};

export const multiNetworkWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            const walletProvider = await initMultiNetworkWalletProvider(runtime);
            
            const ethAddress = walletProvider.getEthereumAddress();
            const swellAddress = walletProvider.getSwellAddress();
            
            const ethBalance = await walletProvider.getEthereumBalance();
            const swellBalance = await walletProvider.getSwellBalance();
            
            return `Ethereum Wallet Address: ${ethAddress}
Ethereum Balance: ${ethBalance} ETH
Swellchain Wallet Address: ${swellAddress}
Swellchain Balance: ${swellBalance} ETH`;
        } catch (error) {
            console.error("Error accessing wallet providers:", error);
            return `Error accessing wallet information: ${(error as Error).message}`;
        }
    },
};