import type { IAgentRuntime, Provider, Memory, State } from "@elizaos/core";
import { ethers } from "ethers";
import { testnetNetworks,mainnetNetworks } from "./network";

export class EthereumWalletProvider {
    wallet: ethers.Wallet;
    
    constructor(privateKey: string, provider: ethers.Provider) {
        this.wallet = new ethers.Wallet(privateKey, provider);
    }
    
    getAddress(): string {
        return this.wallet.address;
    }
    
    async getBalance() {
        const balance = await this.wallet.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
    }
}

export const initEthereumWalletProvider = async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("ETHEREUM_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("ETHEREUM_PRIVATE_KEY is missing");
    }
    
    const ethProviderUrl =
        runtime.getSetting("ETHEREUM_PROVIDER_URL") ||
        mainnetNetworks['ethereum'].rpcUrl;
    
    const provider = new ethers.JsonRpcProvider(ethProviderUrl);
    return new EthereumWalletProvider(privateKey, provider);
};

export const ethereumWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        const walletProvider = await initEthereumWalletProvider(runtime);
        const balance = await walletProvider.getBalance();
        return `Ethereum Wallet Address: ${walletProvider.getAddress()}\nBalance: ${balance} ETH`;
    },
};