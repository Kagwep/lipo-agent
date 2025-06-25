import type { Plugin } from "@elizaos/core";
import { transferAction } from "./actions/transfer";
import { swellWalletProvider } from "./providers/wallet";
import { extractBridgeParamsAction } from "./actions/bridge";
import { multiNetworkWalletProvider } from "./providers/multiwallet";
import { priceAction } from "./actions/price";
import { listEarningOpportunitiesAction } from "./actions/opportunities";
import { earnETHAction } from "./actions/earn";
import { swapAction } from "./actions/swap";

export const swellPlugin: Plugin = {
    name: "swell",
    description: "swellchain integration plugin",
    providers: [multiNetworkWalletProvider],
    evaluators: [],
    services: [],
    actions: [transferAction,extractBridgeParamsAction,swapAction, priceAction,listEarningOpportunitiesAction,earnETHAction],
};

export default swellPlugin;
 