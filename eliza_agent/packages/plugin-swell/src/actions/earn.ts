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
import { earnETHTemplate } from "../templates";
import { RPC_URL } from "../constants";
import { ASSETS, earnETHTokens } from "../providers/tokens";
import { ERC20ABI_E, TellerABI, VaultABI } from "../providers/abis";

type NucleusOperationParams = {
    operation: string;
    token: string;
    amount: string;
    slippage: string;
};

export class NucleusEarnAction {
    constructor(private walletProvider: WalletProvider) {}

    // Get token details from symbol
    getTokenDetails(symbol: string) {
        const upperSymbol = symbol.toUpperCase();
       
        // Handle case sensitivity
        for (const token of ASSETS) {
            if (token.symbol.toUpperCase() === upperSymbol) {
                return token;
            }
        }
       
        // Default to ezETH if token not found
        return earnETHTokens.supportedTokens.ezETH;
    }
   
    // Get balances
    async getBalances(): Promise<{earnETH: string, tokens: Record<string, string>}> {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const userAddress = this.walletProvider.wallet.address;
            const balances: Record<string, string> = {};
           
            // Get earnETH balance
            const vaultContract = new ethers.Contract(
                earnETHTokens.addresses.VAULT,
                VaultABI,
                provider
            );
            const earnETHBal = await vaultContract.balanceOf(userAddress);
            const earnETHBalance = ethers.formatEther(earnETHBal);
           
            // Get token balances
            for (const asset of ASSETS) {
                const tokenContract = new ethers.Contract(
                    asset.address,
                    ERC20ABI_E,
                    provider
                );
                const balance = await tokenContract.balanceOf(userAddress);
                balances[asset.symbol] = ethers.formatUnits(balance, asset.decimals);
            }
           
            return {
                earnETH: earnETHBalance,
                tokens: balances
            };
        } catch (error) {
            console.error("Error getting balances:", error);
            throw new Error(`Failed to get balances: ${error.message}`);
        }
    }
   
    // Check and set token approval if needed
    async approveTokenIfNeeded(tokenAddress: string, amount: string, decimals: number): Promise<boolean> {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const contract = new ethers.Contract(
                tokenAddress,
                ERC20ABI_E,
                provider
            );
           
            const amountWei = ethers.parseUnits(amount, decimals);
           
            // Check current allowance
            const allowance = await contract.allowance(
                this.walletProvider.wallet.address,
                earnETHTokens.addresses.TELLER
            );
           
            // If allowance is less than amount, approve
            if (allowance < amountWei) {
                console.log(`Approving ${tokenAddress} for ${earnETHTokens.addresses.TELLER}`);
               
                // Create approval transaction data
                const data = contract.interface.encodeFunctionData('approve', [
                    earnETHTokens.addresses.TELLER,
                    ethers.MaxUint256
                ]);
               
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
   
    // Deposit to Nucleus
    async deposit(params: NucleusOperationParams): Promise<ethers.TransactionReceipt> {
        try {
            const tokenDetails = this.getTokenDetails(params.token);
            const balances = await this.getBalances();
           
            // Validate balance
            if (parseFloat(params.amount) > parseFloat(balances.tokens[tokenDetails.symbol])) {
                throw new Error(`Insufficient ${tokenDetails.symbol} balance`);
            }
           
            // Approve token if needed
            await this.approveTokenIfNeeded(
                tokenDetails.address,
                params.amount,
                tokenDetails.decimals
            );
           
            // Calculate deposit amount and minimum mint with slippage
            const depositAmountWei = ethers.parseUnits(params.amount, tokenDetails.decimals);
            const slippagePercent = parseFloat(params.slippage);
            const minMintAmount = ethers.parseUnits(
                (parseFloat(params.amount) * (100 - slippagePercent) / 100).toFixed(tokenDetails.decimals),
                tokenDetails.decimals
            );
           
            // Create deposit transaction
            const tellerInterface = new ethers.Interface(TellerABI);
            const data = tellerInterface.encodeFunctionData('deposit', [
                tokenDetails.address,
                depositAmountWei,
                minMintAmount
            ]);
           
            // Send transaction
            const tx = {
                to: earnETHTokens.addresses.TELLER,
                data
            };
           
            const txResponse = await this.walletProvider.wallet.sendTransaction(tx);
            const receipt = await txResponse.wait();
           
            return receipt;
        } catch (error) {
            console.error("Error depositing to Nucleus:", error);
            throw new Error(`Deposit failed: ${error.message}`);
        }
    }
   
    // Withdraw from Nucleus
    async withdraw(params: NucleusOperationParams): Promise<ethers.TransactionReceipt> {
        try {
            const tokenDetails = this.getTokenDetails(params.token);
            const balances = await this.getBalances();
           
            // Validate balance
            if (parseFloat(params.amount) > parseFloat(balances.earnETH)) {
                throw new Error(`Insufficient earnETH balance`);
            }
           
            // Calculate withdraw amount and minimum output with slippage
            const withdrawAmountWei = ethers.parseUnits(params.amount, 18); // earnETH uses 18 decimals
            const slippagePercent = parseFloat(params.slippage);
            const minOutputAmount = ethers.parseUnits(
                (parseFloat(params.amount) * (100 - slippagePercent) / 100).toFixed(tokenDetails.decimals),
                tokenDetails.decimals
            );
           
            // Create withdraw transaction
            const tellerInterface = new ethers.Interface(TellerABI);
            const data = tellerInterface.encodeFunctionData('bulkWithdraw', [
                tokenDetails.address,
                withdrawAmountWei,
                minOutputAmount,
                this.walletProvider.wallet.address
            ]);
           
            // Send transaction
            const tx = {
                to: earnETHTokens.addresses.TELLER,
                data
            };
           
            const txResponse = await this.walletProvider.wallet.sendTransaction(tx);
            const receipt = await txResponse.wait();
           
            return receipt;
        } catch (error) {
            console.error("Error withdrawing from Nucleus:", error);
            throw new Error(`Withdrawal failed: ${error.message}`);
        }
    }
}

// Helper to build operation parameters from user interaction
const buildOperationDetails = async (state: State, runtime: IAgentRuntime) => {
    const context = composeContext({
        state,
        template: earnETHTemplate,
    });
    const operationDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as NucleusOperationParams;
    return operationDetails;
};

// Nucleus Earn Action definition
export const earnETHAction: Action = {
    name: "nucleus_earn",
    description: "Deposit to or withdraw from Nucleus/earnETH vault to earn yield on ETH LSDs",
    handler: async (runtime, _message, state, _options, callback) => {
        const walletProvider = await initSwellWalletProvider(runtime);
        const action = new NucleusEarnAction(walletProvider);
       
        try {
            // Build operation parameters from user intent
            const operationParams = await buildOperationDetails(state, runtime);
           
            // Validate required parameters
            if (!operationParams.operation) {
                if (callback) {
                    callback({
                        text: "I need to know if you want to deposit or withdraw. Please specify the operation.",
                        content: { error: "Missing operation parameter" },
                    });
                }
                return false;
            }
           
            if (!operationParams.amount) {
                if (callback) {
                    callback({
                        text: "I need to know how much you want to deposit or withdraw. Please specify an amount.",
                        content: { error: "Missing amount parameter" },
                    });
                }
                return false;
            }
           
            // Get current balances
            const balances = await action.getBalances();
            const tokenDetails = action.getTokenDetails(operationParams.token);
           
            // Prepare transaction based on operation type
            if (operationParams.operation.toLowerCase() === "deposit") {
                // Notify user about the deposit
                const depositMessage = `
                I'm about to deposit ${operationParams.amount} ${tokenDetails.symbol} to Nucleus/earnETH vault
                💰 Details:
                - Current ${tokenDetails.symbol} balance: ${parseFloat(balances.tokens[tokenDetails.symbol]).toFixed(4)}
                - Current earnETH balance: ${parseFloat(balances.earnETH).toFixed(4)}
                - Amount to deposit: ${operationParams.amount} ${tokenDetails.symbol}
                - Slippage tolerance: ${operationParams.slippage}%
               
                Executing the deposit now...
                `;
               
                if (callback) {
                    callback({
                        text: depositMessage,
                        content: {
                            operationInfo: {
                                type: "deposit",
                                token: tokenDetails.symbol,
                                amount: operationParams.amount,
                                slippage: operationParams.slippage,
                                currentTokenBalance: balances.tokens[tokenDetails.symbol],
                                currentEarnETHBalance: balances.earnETH
                            }
                        },
                    });
                }
               
                // Execute deposit
                const receipt = await action.deposit(operationParams);
               
                // Create success message
                const successMessage = `
                ✅ Deposit completed successfully!
               
                Deposited ${operationParams.amount} ${tokenDetails.symbol} to Nucleus/earnETH vault.
                Transaction Hash: ${receipt.hash}
                <a href="https://swellchainscan.io/tx/${receipt.hash}" target="_blank">View on Swellchain Explorer</a>
                `;
               
                if (callback) {
                    callback({
                        text: successMessage,
                        content: {
                            success: true,
                            hash: receipt.hash,
                            operation: "deposit",
                            amount: operationParams.amount,
                            token: tokenDetails.symbol,
                        },
                    });
                }
               
            } else if (operationParams.operation.toLowerCase() === "withdraw") {
                // Notify user about the withdrawal
                const withdrawMessage = `
                I'm about to withdraw ${operationParams.amount} earnETH from Nucleus vault to ${tokenDetails.symbol}
                💰 Details:
                - Current earnETH balance: ${parseFloat(balances.earnETH).toFixed(4)}
                - Current ${tokenDetails.symbol} balance: ${parseFloat(balances.tokens[tokenDetails.symbol]).toFixed(4)}
                - Amount to withdraw: ${operationParams.amount} earnETH
                - Receiving token: ${tokenDetails.symbol}
                - Slippage tolerance: ${operationParams.slippage}%
               
                Executing the withdrawal now...
                `;
               
                if (callback) {
                    callback({
                        text: withdrawMessage,
                        content: {
                            operationInfo: {
                                type: "withdraw",
                                token: tokenDetails.symbol,
                                amount: operationParams.amount,
                                slippage: operationParams.slippage,
                                currentTokenBalance: balances.tokens[tokenDetails.symbol],
                                currentEarnETHBalance: balances.earnETH
                            }
                        },
                    });
                }
               
                // Execute withdrawal
                const receipt = await action.withdraw(operationParams);
               
                // Create success message
                const successMessage = `
                ✅ Withdrawal completed successfully!
               
                Withdrew ${operationParams.amount} earnETH from Nucleus vault to ${tokenDetails.symbol}.
                Transaction Hash: ${receipt.hash}
                <a href="https://swellchainscan.io/tx/${receipt.hash}" target="_blank">View on Swellchain Explorer</a>
                `;
               
                if (callback) {
                    callback({
                        text: successMessage,
                        content: {
                            success: true,
                            hash: receipt.hash,
                            operation: "withdraw",
                            amount: operationParams.amount,
                            token: tokenDetails.symbol,
                        },
                    });
                }
               
            } else {
                if (callback) {
                    callback({
                        text: "Invalid operation. Please specify either 'deposit' or 'withdraw'.",
                        content: { error: "Invalid operation parameter" },
                    });
                }
                return false;
            }
           
            return true;
        } catch (error) {
            console.error("Error during Nucleus operation:", error);
            if (callback) {
                callback({
                    text: `Error executing operation: ${error.message}`,
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
                    text: "I'll deposit 0.5 ezETH into the Nucleus/earnETH vault for you",
                    action: "NUCLEUS_EARN",
                },
            },
            {
                user: "user",
                content: {
                    text: "Deposit 0.5 ezETH to earn yield",
                    action: "NUCLEUS_EARN",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "I'll withdraw 1.2 earnETH to wstETH with 0.5% slippage",
                    action: "NUCLEUS_EARN",
                },
            },
            {
                user: "user",
                content: {
                    text: "Withdraw 1.2 earnETH to wstETH with 0.5% slippage",
                    action: "NUCLEUS_EARN",
                },
            },
        ],
    ],
    similes: ["EARN_YIELD", "STAKE_ETH", "DEPOSIT_LSD"],
};