import { NetworkInfo } from "../types";

  // Network configurations for testnet
  export const testnetNetworks: Record<string, NetworkInfo> = {
    ethereum: {
      name: 'Ethereum Sepolia',
      chainId: 11155111, // Sepolia testnet
      bridgeAddress: '0xebb79a1d00b2d489f53adee985a2ded2a3553f22', // L1StandardBridge on Sepolia
      rpcUrl: 'https://eth-sepolia.public.blastapi.io',
      blockExplorer: 'https://sepolia.etherscan.io'
    },
    swellchain: {
      name: 'Swellchain Testnet',
      chainId: 1924, // Swellchain testnet
      bridgeAddress: '0x4200000000000000000000000000000000000010', // L2StandardBridge r
      rpcUrl: 'https://swell-testnet.alt.technology',
      blockExplorer: 'https://swell-testnet-explorer.alt.technology'
    }
  };

    // Network configurations for mainnet
  export const mainnetNetworks: Record<string, NetworkInfo> = {
    ethereum: {
      name: 'Ethereum Mainnet',
      chainId: 1, // Ethereum mainnet
      bridgeAddress: '0x7aA4960908B13D104bf056B23E2C76B43c5AACc8', // L1StandardBridgeProxy on Mainnet
      rpcUrl: 'https://eth-mainnet.public.blastapi.io',
      blockExplorer: 'https://etherscan.io'
    },
    swellchain: {
      name: 'Swellchain Mainnet',
      chainId: 1923, // Assuming this is the Swellchain mainnet chain ID
      bridgeAddress: '0x4200000000000000000000000000000000000010', // L2StandardBridge
      rpcUrl: 'https://swell-mainnet.alt.technology',
      blockExplorer: 'https://swellchainscan.io'
    }
};