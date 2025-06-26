import {
    type Action,
    composeContext,
    generateObjectDeprecated,
    type IAgentRuntime,
    ModelClass,
    type State,
} from "@elizaos/core";
import { predictionTemplate } from "../templates";

// Prediction types
type PredictionRequest = {
    tokenPair: string;
    days: number;
    includeSentiment: boolean;
    analysisType: string;
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

export class VolatilityPredictionAction {
    private predictionApiUrl = "http://13.51.85.232:8000/predict";
    
    constructor() {}
    
    // Method to handle volatility predictions
    async fetchVolatilityPrediction(tokenPair: string, days: number): Promise<PredictionResponse> {
        try {
            const url = `${this.predictionApiUrl}?days=${days}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Prediction API request failed with status ${response.status}`);
            }
            
            const data: PredictionResponse = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching volatility prediction:", error);
            throw new Error(`Failed to fetch volatility prediction: ${error.message}`);
        }
    }

    // Method to validate and normalize token pair
    validateTokenPair(tokenPair: string): string {
        const supportedPairs = ["LINKUSDT", "UNIUSDT", "AAVEUSDT", "SUSHIUSDT", "1INCHUSDT"];
        const normalizedPair = tokenPair?.toUpperCase();
        
        if (!supportedPairs.includes(normalizedPair)) {
            return "LINKUSDT"; // Default fallback
        }
        
        return normalizedPair;
    }

    // Method to format volatility level for display
    formatVolatilityLevel(level: string): string {
        switch (level.toUpperCase()) {
            case 'LOW':
                return '🟢 Low Risk';
            case 'MODERATE':
                return '🟡 Moderate Risk';
            case 'HIGH':
                return '🔴 High Risk';
            default:
                return `📊 ${level}`;
        }
    }

    // Method to format prediction response for display
    formatPredictionResponse(prediction: PredictionResponse): string {
        const { prediction: pred } = prediction;
        
        return `📈 **Volatility Analysis for ${pred.trading_pair}**
        
🎯 **Key Metrics:**
• Annualized Volatility: ${pred.annualized_volatility.toFixed(2)}%
• 5-Day Predicted Volatility: ${pred.predicted_volatility_5d.toFixed(2)}%
• Risk Level: ${this.formatVolatilityLevel(pred.volatility_level)}

📊 **Technical Features:**
• Realized Volatility: ${pred.features.realized_vol.toFixed(4)}
• Returns Squared: ${pred.features.returns_squared.toFixed(4)}

📅 **Analysis Date:** ${new Date(pred.timestamp).toLocaleString()}
🔍 **Data Source:** ${pred.data_source}

💡 **Risk Assessment:** ${this.getVolatilityInsight(pred.volatility_level, pred.annualized_volatility)}`;
    }

    // Method to provide volatility insights
    getVolatilityInsight(level: string, annualizedVol: number): string {
        switch (level.toUpperCase()) {
            case 'LOW':
                return "This asset shows relatively stable price movements, suitable for conservative strategies.";
            case 'MODERATE':
                return "Balanced risk-reward profile with moderate price fluctuations expected.";
            case 'HIGH':
                return "High volatility detected - consider risk management strategies and position sizing.";
            default:
                return `Current volatility of ${annualizedVol.toFixed(1)}% suggests careful position management.`;
        }
    }
}

// Action for volatility predictions
export const volatilityPredictionAction: Action = {
    name: "volatilityPrediction",
    description: "Get volatility predictions and analysis for supported token pairs",
    handler: async (runtime, message, state, options, callback) => {
        const action = new VolatilityPredictionAction();
        
        try {
            // Use the prediction template to extract parameters
            const context = composeContext({
                state,
                template: predictionTemplate,
            });

            const prediction = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            }) as PredictionRequest;

            // Validate and normalize the token pair
            const tokenPair = action.validateTokenPair(prediction.tokenPair);
            const days = Math.max(1, Math.min(365, prediction.days || 30));

            // Fetch the prediction
            const predictionResult = await action.fetchVolatilityPrediction(tokenPair, days);
            
            if (callback) {
                const formattedResponse = action.formatPredictionResponse(predictionResult);
                
                callback({
                    text: formattedResponse,
                    content: {
                        success: true,
                        prediction: predictionResult.prediction,
                        requestedPair: tokenPair,
                        requestedDays: days,
                        analysisType: prediction.analysisType || 'volatility'
                    },
                });
            }
            
            return true;
        } catch (error) {
            console.error("Error fetching volatility prediction:", error);
            
            if (callback) {
                callback({
                    text: `❌ Unable to fetch volatility prediction: ${error.message}\n\nSupported pairs: LINKUSDT, UNIUSDT, AAVEUSDT, SUSHIUSDT, 1INCHUSDT`,
                    content: { 
                        success: false, 
                        error: error.message 
                    },
                });
            }
            return false;
        }
    },
    validate: async () => {
        // No wallet needed for predictions, always valid
        return true;
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll analyze the volatility for LINK over the next 30 days",
                    action: "VOLATILITY_PREDICTION",
                },
            },
            {
                user: "user",
                content: {
                    text: "predict LINK volatility",
                    action: "VOLATILITY_PREDICTION",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "Here's the 7-day volatility analysis for UNI",
                    action: "VOLATILITY_PREDICTION",
                },
            },
            {
                user: "user",
                content: {
                    text: "analyze UNI for the last week",
                    action: "VOLATILITY_PREDICTION",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "Full volatility analysis with sentiment for AAVE completed",
                    action: "VOLATILITY_PREDICTION",
                },
            },
            {
                user: "user",
                content: {
                    text: "full analysis of AAVE with sentiment",
                    action: "VOLATILITY_PREDICTION",
                },
            },
        ],
    ],
    similes: ["PREDICT_VOLATILITY", "ANALYZE_VOLATILITY", "CHECK_VOLATILITY", "FORECAST_VOLATILITY"],
};