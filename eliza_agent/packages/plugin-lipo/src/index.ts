import type { Plugin } from "@elizaos/core";
import { multiNetworkWalletProvider } from "./providers/multiwallet";
import { volatilityPredictionAction } from "./actions/predict";


export const lipoPlugin: Plugin = {
    name: "lipo",
    description: "lipo integration plugin",
    providers: [multiNetworkWalletProvider],
    evaluators: [],
    services: [],
    actions: [volatilityPredictionAction],
};

export default lipoPlugin;
 