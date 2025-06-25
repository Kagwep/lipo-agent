import {
    type Action,
    composeContext,
    generateObjectDeprecated,
    type IAgentRuntime,
    ModelClass,
    type State,
} from "@elizaos/core";
import { initSwellWalletProvider, type WalletProvider } from "../providers/wallet";
import { ethers } from "ethers";
import { swapTemplate } from "../templates";
import { neptune } from "../providers/tokens";
import { erc20Abi } from "../providers/abis";
import { NEPTUNE_API_BASE, RPC_URL } from "../constants";
import { QuoteResponse, SwapResponse } from "../types";


type SwapParams = {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage: string;
};


export class SwapAction {
    constructor(private walletProvider: WalletProvider) {}

    // Get token address from symbol
    getTokenAddress(symbol: string): string {
        const upperSymbol = symbol.toUpperCase();
        
        // Check if it's already an address
        if (symbol.startsWith("0x")) {
            return symbol;
        }
        
        // Handle case sensitivity
        for (const [key, value] of Object.entries(neptune.tokens)) {
            if (key.toUpperCase() === upperSymbol) {
                return value;
            }
        }
        
        throw new Error(`Unknown token: ${symbol}`);
    }
    
    // Get token symbol from address
    getTokenSymbol(address: string): string {
        // Check if address matches any token
        for (const [key, value] of Object.entries(neptune.tokens)) {
            if (value.toLowerCase() === address.toLowerCase()) {
                return key;
            }
        }
        
        return address; // Return address if symbol not found
    }

    getTokenDecimals(symbol: string): number {
        // Special case for swBTC
        if (symbol.toLowerCase() === 'swbtc') {
            return 8;
        }
        
        // All other tokens use 18 decimals
        return 18;
    }
    
    // Format amount with proper decimals for display
    formatTokenAmount(amount: string, symbol: string): string {
        // Special case for swBTC
        if (symbol.toLowerCase() === 'swbtc') {
            return ethers.formatUnits(amount, 8);
        }
        
        // All other tokens use 18 decimals
        return ethers.formatUnits(amount, 18);
    }
    
    // Parse amount to proper decimals
    parseTokenAmount(amount: string, symbol: string): bigint {
        // Special case for swBTC
        if (symbol.toLowerCase() === 'swbtc') {
            return ethers.parseUnits(amount, 8);
        }
        
        // All other tokens use 18 decimals
        return ethers.parseUnits(amount, 18);
    }
    
    // Check and approve token allowance if needed
    async approveTokenIfNeeded(tokenAddress: string, spenderAddress: string, amount: string): Promise<boolean> {
        // Skip approval for native ETH
        if (tokenAddress.toLowerCase() === neptune.tokens.ETH.toLowerCase()) {
            return true;
        }
        
        try {

            const provider = new ethers.JsonRpcProvider(RPC_URL);

            const contract = new ethers.Contract(
                tokenAddress,
                erc20Abi,
                provider
            );
            
            // Check current allowance
            const allowance = await contract.allowance(
                this.walletProvider.wallet.address,
                spenderAddress
            );
            
            // If allowance is less than amount, approve
            if (allowance < BigInt(amount)) {
                console.log(`Approving ${tokenAddress} for ${spenderAddress}`);
                
                // Create approval transaction data
                const data = contract.interface.encodeFunctionData('approve', [spenderAddress, amount]);
                
                // Send the approval transaction
                const tx = {
                    to: tokenAddress,
                    data
                };
                
                const txResponse = await this.walletProvider.wallet.sendTransaction(tx);
                await txResponse.wait();
                
                return true;
            }
            
            return true;
        } catch (error) {
            console.error("Error approving token:", error);
            throw new Error(`Failed to approve token: ${error.message}`);
        }
    }
    // Get quote for swap
    async getSwapQuote(params: SwapParams): Promise<QuoteResponse> {
        try {
            const tokenInAddress = this.getTokenAddress(params.tokenIn);
            const tokenOutAddress = this.getTokenAddress(params.tokenOut);
            const decimals = this.getTokenDecimals(params.tokenIn);
            
            // Convert amount to wei
            const amountInWei = ethers.parseUnits(params.amountIn, decimals).toString();
            
            // Build query URL
            const url = new URL(`${NEPTUNE_API_BASE}/quote`);
            url.searchParams.append("tokenIn", tokenInAddress);
            url.searchParams.append("tokenOut", tokenOutAddress);
            url.searchParams.append("amountIn", amountInWei);
            
            // Make request
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`Quote request failed with status ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Error getting swap quote:", error);
            throw new Error(`Failed to get swap quote: ${error.message}`);
        }
    }
    
    // Get swap transaction data
    async getSwapTransaction(params: SwapParams): Promise<SwapResponse> {
        try {
            const tokenInAddress = this.getTokenAddress(params.tokenIn);
            const tokenOutAddress = this.getTokenAddress(params.tokenOut);
            const decimals = this.getTokenDecimals(params.tokenIn);
            
            // Convert amount to wei
            const amountInWei = ethers.parseUnits(params.amountIn, decimals).toString();
            
            // Convert slippage from percentage to decimal (e.g. 0.5 -> 0.005)
            const slippageDecimal = parseFloat(params.slippage) / 100;
            
            // Build query URL
            const url = new URL(`${NEPTUNE_API_BASE}/swap`);
            url.searchParams.append("tokenIn", tokenInAddress);
            url.searchParams.append("tokenOut", tokenOutAddress);
            url.searchParams.append("amountIn", amountInWei);
            url.searchParams.append("slippage", slippageDecimal.toString());
            url.searchParams.append("receiver", this.walletProvider.wallet.address);
            
            // Add deadline (20 minutes from now)
            const deadline = Math.floor(Date.now() / 1000) + 1200;
            url.searchParams.append("deadline", deadline.toString());
            
            // Make request
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`Swap request failed with status ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("Error getting swap transaction:", error);
            throw new Error(`Failed to get swap transaction: ${error.message}`);
        }
    }
    
    // Execute swap
    async executeSwap(params: SwapParams): Promise<ethers.TransactionReceipt> {
        try {
            // Get swap data
            const swapData = await this.getSwapTransaction(params);
            
            // Check if we need to approve tokens first
            const tokenInAddress = this.getTokenAddress(params.tokenIn);
            const isNativeToken = tokenInAddress.toLowerCase() === neptune.tokens.ETH.toLowerCase();
            
            // If not using native ETH, approve the token spend
            if (!isNativeToken) {
                await this.approveTokenIfNeeded(
                    tokenInAddress,
                    swapData.tx.router,
                    swapData.quote.amountIn
                );
            }
            
            // Create transaction request
            const txRequest = {
                to: swapData.tx.router,
                data: swapData.tx.data,
                value: isNativeToken ? BigInt(swapData.quote.amountIn) : BigInt(0)
            };
            
            // Send transaction
            const txResponse = await this.walletProvider.wallet.sendTransaction(txRequest);
            
            // Wait for transaction to be mined
            const receipt = await txResponse.wait();
            
            return receipt;
        } catch (error) {
            console.error("Error executing swap:", error);
            throw new Error(`Swap failed: ${error.message}`);
        }
    }
}

// Helper to build swap parameters from user interaction
const buildSwapDetails = async (state: State, runtime: IAgentRuntime) => {
    const context = composeContext({
        state,
        template: swapTemplate,
    });
    const swapDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as SwapParams;
    return swapDetails;
};

// Swap Action definition
export const swapAction: Action = {
    name: "swap",
    description: "Swap tokens on Swellchain using Neptune Finance aggregator",
    handler: async (runtime, _message, state, _options, callback) => {
        const walletProvider = await initSwellWalletProvider(runtime);
        const action = new SwapAction(walletProvider);
        
        try {
            // Build swap parameters from user intent
            const swapParams = await buildSwapDetails(state, runtime);
            
            // Validate required parameters
            if (!swapParams.amountIn) {
                if (callback) {
                    callback({
                        text: "I need to know how much you want to swap. Please specify an amount.",
                        content: { error: "Missing amount parameter" },
                    });
                }
                return false;
            }
            
            // First get a quote to show the user
            const quoteResponse = await action.getSwapQuote(swapParams);
            
            // Get symbols for display
            const tokenInSymbol = action.getTokenSymbol(quoteResponse.tokenIn);
            const tokenOutSymbol = action.getTokenSymbol(quoteResponse.tokenOut);
            
            // Format amounts for display
            const amountInFormatted = action.formatTokenAmount(
                quoteResponse.amountIn,
                tokenInSymbol
            );
            const amountOutFormatted = action.formatTokenAmount(
                quoteResponse.amountOut,
                tokenOutSymbol
            );
            
            // Calculate price impact
            const priceImpact = Math.abs(
                parseFloat(quoteResponse.amountOutUsd as unknown as string) / parseFloat(quoteResponse.amountInUsd as unknown as string) - 1
            ) * 100;
            
            // Show quote information
            const quoteMessage = `
            I'm about to swap ${amountInFormatted} ${tokenInSymbol} for approximately ${amountOutFormatted} ${tokenOutSymbol}

            💰 Details:
            - Input value: $${parseFloat(quoteResponse.amountInUsd as unknown as string).toFixed(2)}
            - Output value: $${parseFloat(quoteResponse.amountOutUsd as unknown as string).toFixed(2)} 
            - Slippage tolerance: ${swapParams.slippage}%
            - Price impact: ${priceImpact.toFixed(2)}%

            Executing the swap now...
            `;
            
            if (callback) {
                callback({
                    text: quoteMessage,
                    content: {
                        quoteInfo: {
                            tokenIn: tokenInSymbol,
                            tokenOut: tokenOutSymbol,
                            amountIn: amountInFormatted,
                            amountOut: amountOutFormatted,
                            amountInUsd: quoteResponse.amountInUsd,
                            amountOutUsd: quoteResponse.amountOutUsd,
                            priceImpact: priceImpact.toFixed(2)
                        }
                    },
                });
            }
            
            // Execute the swap
            const receipt = await action.executeSwap(swapParams);
            
            // Create success message with clickable link
            const successMessage = `
            ✅ Swap completed successfully!

            Swapped ${amountInFormatted} ${tokenInSymbol} for approximately ${amountOutFormatted} ${tokenOutSymbol}
            Transaction Hash: ${receipt.hash}

            <a href="https://explorer.swellnetwork.io/tx/${receipt.hash}" target="_blank">View on Swellchain Explorer</a>
            `;
                        
            if (callback) {
                callback({
                    text: successMessage,
                    content: {
                        success: true,
                        hash: receipt.hash,
                        amountIn: amountInFormatted,
                        amountOut: amountOutFormatted,
                        tokenIn: tokenInSymbol,
                        tokenOut: tokenOutSymbol,
                    },
                });
            }
            
            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            if (callback) {
                callback({
                    text: `Error executing swap: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("SWELL_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll help you swap 0.1 ETH for SWELL tokens",
                    action: "SWAP",
                },
            },
            {
                user: "user",
                content: {
                    text: "I want to swap 0.1 ETH for SWELL",
                    action: "SWAP",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I'll swap 100 USDe to swETH for you with 0.3% slippage",
                    action: "SWAP",
                },
            },
            {
                user: "user",
                content: {
                    text: "Swap 100 USDe to swETH with 0.3% slippage",
                    action: "SWAP",
                },
            },
        ],
    ],
    similes: ["TRADE_TOKENS", "EXCHANGE_CRYPTO", "DEX_SWAP"],
};