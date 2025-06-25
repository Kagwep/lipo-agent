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
import { priceOracleTemplate } from "../templates";
import { priceFeedAddresses } from "../providers/contracts";
import { PriceOracleABI } from "../providers/abis";
import { RPC_URL } from "../constants";

type PriceParams = {
    tradingPair: string,
    timestampRequired: boolean,
    historicalData: boolean
};

export class PriceOracleAction {
    constructor(private walletProvider: WalletProvider) {}

    async Price(params: PriceParams) {
        try {

            const tempPrices: Record<string, string> = {};

            const { tradingPair, timestampRequired,historicalData } = params;

            const address = priceFeedAddresses[tradingPair as keyof typeof priceFeedAddresses];

            if (!address) {
                throw new Error(`No oracle address found for ${tradingPair}`);
              }
            
            const provider = new ethers.JsonRpcProvider(RPC_URL);

            const contract = new ethers.Contract(address, PriceOracleABI, provider);

            // Get price data
            try {
                // Try to get full round data if supported
                const roundData = await contract.latestRoundData();
                const decimals = await contract.decimals();
                
                // Format using ethers v6 syntax
                const price = ethers.formatUnits(roundData[1], decimals);
                
                tempPrices[tradingPair] = price;
                
                // Add timestamp information 
                const timestamp = new Date(Number(roundData[3]) * 1000).toLocaleString();
                tempPrices[`${tradingPair} Updated`] = timestamp;

                return tempPrices

            } catch (roundError) {
                // Fallback to simple price if latestRoundData is not supported
                try {
                const rawPrice = await contract.latestAnswer();
                const decimals = await contract.decimals();
                
                // Format using ethers v6 syntax
                const price = ethers.formatUnits(rawPrice, decimals);
                tempPrices[tradingPair] = price;

                return tempPrices

                } catch (priceError) {
                throw new Error(`Failed to get price: ${priceError}`);
                }
            }

  
        } catch (error) {
            throw new Error(`Get Price failed: ${error.message}`);
        }
    }
}

const buildPriceDetails = async (state: State, runtime: IAgentRuntime) => {
    const context = composeContext({
        state,
        template: priceOracleTemplate,
    });
    const PriceDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as PriceParams;
    return PriceDetails;
};

export const priceAction: Action = {
    name: "Price",
    description: "Price ETH between addresses on Swellchain",
    handler: async (runtime, _message, state, _options, callback) => {
        const walletProvider = await initSwellWalletProvider(runtime);
        const action = new PriceOracleAction(walletProvider);
        const paramOptions = await buildPriceDetails(state, runtime);


        try {
            const priceResp = await action.Price(paramOptions);
            if (callback) {
                // Get the actual price value from the record
                const priceValue = priceResp[paramOptions.tradingPair] || "Not available";
                
                // Get timestamp if available
                const lastUpdated = priceResp[`${paramOptions.tradingPair} Updated`] || "Unknown";

                callback({
                    text: `Successfully fetched price data for ${paramOptions.tradingPair}. Current price: ${priceValue}`,
                    content: {
                        success: true,
                        tradingPair: paramOptions.tradingPair,
                        prices: priceResp, // Include the full record of prices
                        lastUpdated: lastUpdated
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error during fetchin Price:", error);
            if (callback) {
                callback({
                    text: `Error getting price: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    // template: PriceTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("SWELL_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll get the current ETH/USDC price for you. The latest price is 1574.87 USDC per ETH, last updated at 9:02:27 PM today.",
                    action: "FETCH_PRICE",
                },
            },
            {
                user: "user",
                content: {
                    text: "What's the current price of ETH?",
                    action: "FETCH_PRICE",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "The current USDT price is 0.998 USDC. This price was last updated at 9:01:15 PM today.",
                    action: "FETCH_PRICE",
                },
            },
            {
                user: "user",
                content: {
                    text: "Show me USDT price with timestamp",
                    action: "FETCH_PRICE",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I've fetched the swETH/ETH price ratio. The current rate is 1.0154 ETH per swETH.",
                    action: "FETCH_PRICE",
                },
            },
            {
                user: "user",
                content: {
                    text: "What's the swETH to ETH ratio?",
                    action: "FETCH_PRICE",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "The wstETH/stETH ratio is currently 1.1365. This price data comes from the Redstone oracle on Swellchain.",
                    action: "FETCH_PRICE",
                },
            },
            {
                user: "user",
                content: {
                    text: "Check wstETH/stETH price",
                    action: "FETCH_PRICE",
                },
            },
        ],
    ],
    similes: ["PRICE"],
};