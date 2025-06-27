import {
    type Action,
    composeContext,
    generateObjectDeprecated,
    type IAgentRuntime,
    ModelClass,
    type State,
} from "@elizaos/core";
import { rebalanceTemplate } from "../templates";
import { ethers } from "ethers";
import { ADDRESSES } from "../providers/tokens";
import { rebalance, RebalanceParams, RebalanceResult } from "../utils/rebalancer";
import { initUniswapV3PositionManager } from "../providers/uniswapPositionManger";
import { sendRebalanceEmail, VolatilityPredictionAction } from "../utils";


// Rebalance types
type RebalanceRequest = {
    tokenPair: string;
    volatilityThreshold: string;
    customVolatilityLimit: number | null;
    rebalanceAction: string;
    // Removed confirmationRequired field
};

type PredictionResponse = {
    message: string;
    prediction: {
        annualized_volatility: number;
        data_source: string;
        features: {
            realized_vol: number;
            returns_squared: number;
        };
        predicted_volatility_5d: number;
        timestamp: string;
        trading_pair: string;
        volatility_level: string;
    };
    success: boolean;
};

interface ContractAddresses {
    nftManager: string;
    tokenA: string;
    tokenB: string;
    pool: string;
}

export class RebalancerAction {
     volatilityAction: VolatilityPredictionAction;
    
    constructor() {
        this.volatilityAction = new VolatilityPredictionAction();
    }
    
    // Get contract addresses based on network
    getContractAddresses(chainId: number, tokenPair: string): ContractAddresses {
        // For testnet, we'll use UNI/USDC as the main pair since other tokens might not be available
        const getTokenAddresses = (pair: string) => {
            switch (pair.toUpperCase()) {
                case 'UNIUSDT':
                case 'LINKUSDT':
                case 'AAVEUSDT': 
                case 'SUSHIUSDT':
                case '1INCHUSDT':
                    return {
                        tokenA: ADDRESSES.UNI[chainId],
                        tokenB: ADDRESSES.USDC[chainId],
                    };
                case 'UNIWETH':
                    return {
                        tokenA: ADDRESSES.UNI[chainId],
                        tokenB: ADDRESSES.WETH[chainId],
                    };
                default:
                    // Default to UNI/USDC
                    return {
                        tokenA: ADDRESSES.UNI[chainId],
                        tokenB: ADDRESSES.USDC[chainId],
                    };
            }
        };
        
        const tokens = getTokenAddresses(tokenPair);
        
        return {
            nftManager: ADDRESSES.NonfungiblePositionManager[chainId],
            tokenA: tokens.tokenA,
            tokenB: tokens.tokenB,
            pool: "0x287B0e934ed0439E2a7b1d5F0FC25eA2c24b64f7" // Your existing pool address
        };
    }
    
    // Convert volatility threshold to percentage
     getVolatilityThresholdPercentage(threshold: string): number {
        switch (threshold.toUpperCase()) {
            case 'LOW':
                return 2.0;
            case 'MODERATE':
                return 5.0;
            case 'HIGH':
                return 10.0;
            case 'EXTREME':
                return 20.0;
            default:
                return 5.0; // Default to moderate
        }
    }
    
    // Determine if rebalancing is needed based on volatility
     shouldRebalance(
        currentVolatility: number, 
        threshold: string, 
        customLimit: number | null
    ): { shouldRebalance: boolean; reason: string } {
        const thresholdValue = customLimit || this.getVolatilityThresholdPercentage(threshold);
        
        if (currentVolatility > thresholdValue) {
            return {
                shouldRebalance: true,
                reason: `Current volatility (${currentVolatility.toFixed(2)}%) exceeds threshold (${thresholdValue}%)`
            };
        }
        
        return {
            shouldRebalance: false,
            reason: `Current volatility (${currentVolatility.toFixed(2)}%) is below threshold (${thresholdValue}%)`
        };
    }
    
       // Calculate position amounts based on action type - 
    calculatePositionAmounts(
        action: string, 
        currentVolatility: number,
        baseUNIAmount: bigint = ethers.parseUnits("0.0001", 18), // 0.0001 UNI base
        baseWETHAmount: bigint = ethers.parseUnits("0.001", 18)   // 0.001 WETH base
    ): { tokenA_amount: bigint; tokenB_amount: bigint } {
        switch (action.toLowerCase()) {
            case 'reduce_exposure':
                // Reduce position size based on volatility
                const reductionFactor = Math.min(currentVolatility / 20, 0.5); // Max 50% reduction
                return {
                    tokenA_amount: baseUNIAmount - (baseUNIAmount * BigInt(Math.floor(reductionFactor * 100)) / BigInt(100)),
                    tokenB_amount: baseWETHAmount - (baseWETHAmount * BigInt(Math.floor(reductionFactor * 100)) / BigInt(100))
                };
                
            case 'increase_exposure':
                // Increase position size (but be careful with high volatility)
                const increaseFactor = Math.max(1.2, 2 - currentVolatility / 10);
                return {
                    tokenA_amount: baseUNIAmount * BigInt(Math.floor(increaseFactor * 100)) / BigInt(100),
                    tokenB_amount: baseWETHAmount * BigInt(Math.floor(increaseFactor * 100)) / BigInt(100)
                };
                
            case 'exit_position':
                // Close position (set amounts to 0 for new position)
                return {
                    tokenA_amount: BigInt(0),
                    tokenB_amount: BigInt(0)
                };
                
            case 'auto_optimize':
            default:
                // Auto-optimize based on volatility
                if (currentVolatility > 15) {
                    // High volatility: reduce exposure
                    return {
                        tokenA_amount: baseUNIAmount * BigInt(75) / BigInt(100), // 75% of base
                        tokenB_amount: baseWETHAmount * BigInt(75) / BigInt(100)
                    };
                } else if (currentVolatility < 5) {
                    // Low volatility: increase exposure
                    return {
                        tokenA_amount: baseUNIAmount * BigInt(125) / BigInt(100), // 125% of base
                        tokenB_amount: baseWETHAmount * BigInt(125) / BigInt(100)
                    };
                } else {
                    // Moderate volatility: maintain base amount
                    return {
                        tokenA_amount: baseUNIAmount,
                        tokenB_amount: baseWETHAmount
                    };
                }
        }
    }
    
    // Format rebalance result for display
     formatRebalanceResult(
        result: RebalanceResult,
        rebalanceRequest: RebalanceRequest,
        prediction: PredictionResponse
    ): string {
        const { prediction: pred } = prediction;
        
        if (!result.success) {
            return `❌ **Rebalance Failed**
            
🚫 **Error:** ${result.message}
📊 **Volatility Analysis:** ${pred.predicted_volatility_5d.toFixed(2)}% (5-day)
💡 **Suggestion:** Check wallet balance and approvals, then try again.`;
        }
        
        if (rebalanceRequest.rebalanceAction === 'exit_position') {
            return `✅ **Position Exited Successfully**
            
🎯 **Action:** Closed positions due to ${rebalanceRequest.volatilityThreshold} volatility
📊 **Current Volatility:** ${pred.predicted_volatility_5d.toFixed(2)}%
🔄 **Closed Positions:** ${result.closedPositions.join(', ')}
💰 **Tokens Collected:** All liquidity removed
📅 **Timestamp:** ${new Date().toLocaleString()}`;
        }
        
        return `✅ **Position Rebalanced Successfully**
        
🎯 **Pair:** ${pred.trading_pair}
📊 **Volatility Analysis:** ${pred.predicted_volatility_5d.toFixed(2)}% (5-day predicted)
🔄 **Action Taken:** ${rebalanceRequest.rebalanceAction}
📈 **Risk Level:** ${this.volatilityAction.formatVolatilityLevel(pred.volatility_level)}

🔄 **Transaction Details:**
• Closed Positions: ${result.closedPositions.join(', ')}
• New Position Range: Ticks ${result.tickRange[0]} to ${result.tickRange[1]}
• Transaction Hash: ${result.newPositionTx?.hash || 'N/A'}

📊 **Technical Metrics:**
• Realized Volatility: ${pred.features.realized_vol.toFixed(4)}
• Annualized Volatility: ${pred.annualized_volatility.toFixed(2)}%

💡 **Strategy:** Position optimized based on current volatility conditions
📅 **Timestamp:** ${new Date(pred.timestamp).toLocaleString()}`;
    }
}

// Main rebalancer action
export const rebalancerAction: Action = {
    name: "rebalancer",
    description: "Rebalance Uniswap V3 liquidity positions based on volatility predictions",
    handler: async (runtime, message, state, options, callback) => {
        const action = new RebalancerAction();
        
        try {
            // Parse rebalance request using template
            const context = composeContext({
                state,
                template: rebalanceTemplate,
            });
            
            const rebalanceRequest = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            }) as RebalanceRequest;
            
            // Validate token pair
            const tokenPair = action.volatilityAction.validateTokenPair(rebalanceRequest.tokenPair);
            
            // Get volatility prediction
            const prediction = await action.volatilityAction.fetchVolatilityPrediction(tokenPair, 15);
            
            console.log(prediction);
            // Check if rebalancing is needed
            const { shouldRebalance, reason } = action.shouldRebalance(
                prediction.prediction.predicted_volatility_5d,
                rebalanceRequest.volatilityThreshold,
                rebalanceRequest.customVolatilityLimit
            );
            
            if (!shouldRebalance && rebalanceRequest.rebalanceAction !== 'exit_position') {
                if (callback) {
                    callback({
                        text: `📊 **No Rebalancing Needed**
                        
${reason}
📈 **Current Analysis:** ${action.volatilityAction.formatPredictionResponse(prediction)}

💡 **Recommendation:** Position is within acceptable risk parameters.`,
                        content: {
                            success: true,
                            rebalanceNeeded: false,
                            reason,
                            prediction: prediction.prediction
                        }
                    });
                }
                return true;
            }
            
            // Removed confirmation logic - proceed directly to rebalancing
            
            // Determine network (default to sepolia for testing)
            const chainId = parseInt(runtime.getSetting("ETHEREUM_CHAIN_ID")) || 11155111; // Default to Sepolia

            const newTokenPair = 'UNIWETH'
            const addresses = action.getContractAddresses(chainId, newTokenPair);
            
            // Calculate position amounts
            const amounts = action.calculatePositionAmounts(
                rebalanceRequest.rebalanceAction,
                prediction.prediction.predicted_volatility_5d
            );
            
            // Initialize position manager
            const positionManager = await initUniswapV3PositionManager(runtime);
            
            // Prepare rebalance parameters
            const rebalanceParams: RebalanceParams = {
                tokenA_amount: amounts.tokenA_amount,
                tokenB_amount: amounts.tokenB_amount,
                realized_vol: prediction.prediction.features.realized_vol,
                predictionResponse: prediction,
                confidenceMultiplier: 1.96
            };
            
            // Execute rebalance immediately
            const result = await rebalance(positionManager, addresses, rebalanceParams);

            try {
                await sendRebalanceEmail(runtime, result, rebalanceRequest, prediction);
                console.log("Rebalance report email sent successfully");
            } catch (error) {
                console.error("Failed to send rebalance email:", error);
                // Don't throw - email failure shouldn't break main functionality
            }
            
            if (callback) {
                const formattedResponse = action.formatRebalanceResult(result, rebalanceRequest, prediction);
                
                callback({
                    text: formattedResponse,
                    content: {
                        success: result.success,
                        rebalanceResult: {
                            ...result,
                            closedPositions: result.closedPositions.map(pos => pos.toString()), // ✅ Convert BigInt[] to string[]
                            // Remove the transaction object if it exists (not JSON serializable)
                            newPositionTx: result.newPositionTx ? {
                                hash: result.newPositionTx.hash,
                                // Add other serializable properties you need
                            } : undefined
                        },
                        prediction: prediction.prediction,
                        rebalanceRequest
                    }
                });
            }
            
            return result.success;
            
        } catch (error) {
            console.error("Error in rebalancer action:", error);
            
            if (callback) {
                callback({
                    text: `❌ **Rebalance Failed**
                    
🚫 **Error:** ${error.message}

**Supported pairs:** LINKUSDT, UNIUSDT, AAVEUSDT, SUSHIUSDT, 1INCHUSDT
**Supported actions:** reduce_exposure, increase_exposure, exit_position, auto_optimize`,
                    content: { 
                        success: false, 
                        error: error.message 
                    }
                });
            }
            return false;
        }
    },
    
    validate: async (runtime) => {
        // Check if required settings are present
        const privateKey = runtime.getSetting("ETHEREUM_PRIVATE_KEY");
        return !!privateKey;
    },
    
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll rebalance your LINK position based on current volatility",
                    action: "REBALANCER",
                },
            },
            {
                user: "user",
                content: {
                    text: "rebalance LINK if volatility is high",
                    action: "REBALANCER",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "Position automatically optimized for UNI based on moderate volatility threshold",
                    action: "REBALANCER",
                },
            },
            {
                user: "user",
                content: {
                    text: "auto-optimize UNI position",
                    action: "REBALANCER",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "AAVE position will be exited due to extreme volatility conditions",
                    action: "REBALANCER",
                },
            },
            {
                user: "user",
                content: {
                    text: "exit AAVE if volatility is extreme",
                    action: "REBALANCER",
                },
            },
        ],
    ],
    
    similes: [
        "REBALANCE_POSITION", 
        "OPTIMIZE_LIQUIDITY", 
        "ADJUST_POSITION", 
        "MANAGE_RISK", 
        "REBALANCE_LP"
    ],
};