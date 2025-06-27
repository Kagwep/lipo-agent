import type { Plugin } from "@elizaos/core";
import { multiNetworkWalletProvider } from "./providers/multiwallet";
import { volatilityPredictionAction } from "./actions/predict";
import { rebalancerAction } from "./actions/rebalanceAction";


export const lipoPlugin: Plugin = {
    name: "lipo",
    description: "lipo integration plugin",
    providers: [multiNetworkWalletProvider],
    evaluators: [],
    services: [],
    actions: [volatilityPredictionAction,rebalancerAction],
};

export default lipoPlugin;
 