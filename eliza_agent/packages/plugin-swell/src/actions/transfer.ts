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
import { transferTemplate } from "../templates";

type TransferParams = {
    toAddress: string;
    amount: string;
};

export class TransferAction {
    constructor(private walletProvider: WalletProvider) {}

    async transfer(params: TransferParams) {
        try {
            const { toAddress, amount } = params;
            
            // Convert the amount from ETH to Wei
            const amountInWei = ethers.parseEther(amount);
            
            // Create transaction object
            const tx = {
                to: toAddress,
                value: amountInWei
            };
            
            // Send the transaction
            const txResponse = await this.walletProvider.wallet.sendTransaction(tx);

  
            
            // Wait for the transaction to be mined
            const receipt = await txResponse.wait();
            
            return receipt;
        } catch (error) {
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }
}

const buildTransferDetails = async (state: State, runtime: IAgentRuntime) => {
    const context = composeContext({
        state,
        template: transferTemplate,
    });
    const transferDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as TransferParams;
    return transferDetails;
};

export const transferAction: Action = {
    name: "transfer",
    description: "Transfer ETH between addresses on Swellchain",
    handler: async (runtime, _message, state, _options, callback) => {
        const walletProvider = await initSwellWalletProvider(runtime);
        const action = new TransferAction(walletProvider);
        const paramOptions = await buildTransferDetails(state, runtime);


        try {
            const transferResp = await action.transfer(paramOptions);
            if (callback) {
                callback({
                    text: `Successfully transferred ${paramOptions.amount} ETH to ${paramOptions.toAddress}\nTransaction Hash: ${transferResp.hash}`,
                    content: {
                        success: true,
                        hash: transferResp.hash,
                        amount: paramOptions.amount,
                        recipient: paramOptions.toAddress,
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error during token transfer:", error);
            if (callback) {
                callback({
                    text: `Error transferring tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    // template: transferTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("SWELL_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll help you transfer 1 ETH to 0x8F8afB12402C9a4bD9678Bec363E51360142f8443FB171655eEd55dB298828D1",
                    action: "SEND_TOKENS",
                },
            },
            {
                user: "user",
                content: {
                    text: "Transfer 1 ETH to 0x8F8afB12402C9a4bD9678Bec363E51360142f8443FB171655eEd55dB298828D1",
                    action: "SEND_TOKENS",
                },
            },
        ],
    ],
    similes: ["TRANSFER_ETH"],
};