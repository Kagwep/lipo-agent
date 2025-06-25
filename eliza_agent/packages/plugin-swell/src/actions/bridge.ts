import {
    composeContext,
    generateObjectDeprecated,
    type IAgentRuntime,
    ModelClass,
    type State,
    type Action,
} from "@elizaos/core";
import { bridgeTemplate } from "../templates";

type BridgeParams = {
    token: string,
    amount: string,
    sourceNetwork: string,
    destinationNetwork: string
};

export const extractBridgeParamsAction: Action = {
    name: "extract_bridge_params",
    description: "Extract bridge parameters and return as JSON",
    handler: async (runtime, _message, state, _options, callback) => {
        try {
            const context = composeContext({
                state,
                template: bridgeTemplate,
            });
            
            const params = (await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            })) as BridgeParams;
            
            if (callback) {
                callback({
                    text: JSON.stringify(params, null, 2), // Just the JSON
                    content: params, // Raw JSON object
                });
            }
            
            return params;
            
        } catch (error) {
            const errorResponse = {
                error: error.message,
                success: false
            };
            
            if (callback) {
                callback({
                    text: JSON.stringify(errorResponse, null, 2),
                    content: errorResponse,
                });
            }
            
            return null;
        }
    },
    validate: async () => true,
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: JSON.stringify({
                        token: "ETH",
                        amount: "1",
                        sourceNetwork: "ethereum",
                        destinationNetwork: "swellchain"
                    }, null, 2),
                },
            },
            {
                user: "user",
                content: {
                    text: "Bridge 1 ETH to Swellchain",
                },
            },
        ],
    ],
    similes: ["EXTRACT_JSON", "PARSE_PARAMS"],
};