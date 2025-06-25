import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransferAction } from "../actions/transfer";
import { WalletProvider } from "../providers/wallet";
import { ethers } from "ethers";

describe("Transfer Action", () => {
    let wp: WalletProvider;

    beforeEach(async () => {
        const provider = new ethers.JsonRpcProvider(
            "https://swell-mainnet.alt.technology"
        );
        wp = new WalletProvider(
            process.env.ETH_WALLET_PRIVATE_KEY as string,
            provider
        );
    });

    describe("Constructor", () => {
        it("should initialize with wallet provider", () => {
            const ta = new TransferAction(wp);
            expect(ta).toBeDefined();
        });
    });

    describe("Transfer", () => {
        let ta: TransferAction;
        let receiver: string;

        beforeEach(async () => {
            ta = new TransferAction(wp);
            // Generate a random Ethereum address for the receiver
            const randomWallet = ethers.Wallet.createRandom();
            receiver = randomWallet.address;
        });

        it("throws if not enough gas", async () => {
            // Assuming a very large amount that would exceed any test wallet balance
            await expect(
                ta.transfer({
                    toAddress: receiver,
                    amount: "1000", // 1000 ETH, likely more than test wallet has
                })
            ).rejects.toThrow(/insufficient funds/i);
        });

        it("should transfer funds if there is enough balance", async () => {
            // Mock the transaction response
            const mockTxResponse = {
                hash: "0x123456789abcdef",
                wait: async () => ({
                    status: 1, // 1 means success in Ethereum
                    hash: "0x123456789abcdef",
                    blockNumber: 12345
                })
            };

            // Mock the wallet.sendTransaction method
            const originalSendTransaction = wp.wallet.sendTransaction;
            wp.wallet.sendTransaction = vi.fn().mockResolvedValue(mockTxResponse);

            try {
                const tx = await ta.transfer({
                    toAddress: receiver,
                    amount: "0.00001",
                });

                expect(tx).toBeDefined();
                expect(tx.status).toBe(1);
                expect(tx.hash).toBe("0x123456789abcdef");
            } finally {
                // Restore the original method
                wp.wallet.sendTransaction = originalSendTransaction;
            }
        });
    });
});