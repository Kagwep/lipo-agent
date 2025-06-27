import type { IAgentRuntime, Provider, Memory, State } from "@elizaos/core";
import { ethers, Contract } from "ethers";
import { testnetNetworks, mainnetNetworks } from "./network";

// ABI imports - you'll need to add these ABIs
import { WETHABI, UNIABI, USDCABI, NPositionManagerABI, PositionFactoryABI, RouterABI } from "./abis";

const MAX_UINT_128 = BigInt(2) ** BigInt(128) - BigInt(1);

export interface MintParams {
    token0: string;
    token1: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
    amount0Desired: bigint;
    amount1Desired: bigint;
    amount0Min: bigint;
    amount1Min: bigint;
    recipient: string;
    deadline: number;
}

export interface PositionInfo {
    nonce: bigint;
    operator: string;
    token0: string;
    token1: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
    liquidity: bigint;
    feeGrowthInside0LastX128: bigint;
    feeGrowthInside1LastX128: bigint;
    tokensOwed0: bigint;
    tokensOwed1: bigint;
}

export class UniswapV3PositionManager {
    wallet: ethers.Wallet;
    nftManager: Contract;
    
    constructor(privateKey: string, provider: ethers.Provider, nftManagerAddress: string) {
        this.wallet = new ethers.Wallet(privateKey, provider);
        this.nftManager = new Contract(nftManagerAddress, NPositionManagerABI, this.wallet);
    }

    /**
     * Check if token has sufficient allowance for spender
     */
    async checkAllowance(
        tokenAddress: string, 
        spenderAddress: string, 
        amount: bigint
    ): Promise<boolean> {
        const tokenABI = tokenAddress.toLowerCase().includes('usdc') ? USDCABI : 
                        tokenAddress.toLowerCase().includes('weth') ? WETHABI : UNIABI;
        
        const token = new Contract(tokenAddress, tokenABI, this.wallet);
        const allowance = await token.allowance(this.wallet.address, spenderAddress);
        return allowance >= amount;
    }

    /**
     * Approve token for spender
     */
    async approveToken(
        tokenAddress: string, 
        spenderAddress: string, 
        amount: bigint
    ): Promise<ethers.ContractTransactionResponse> {
        const tokenABI = tokenAddress.toLowerCase().includes('usdc') ? USDCABI : 
                        tokenAddress.toLowerCase().includes('weth') ? WETHABI : UNIABI;
        
        const token = new Contract(tokenAddress, tokenABI, this.wallet);
        return await token.approve(spenderAddress, amount);
    }

    /**
     * Get mint parameters for creating a new position
     */
    getMintParams(
        tokenAAddress: string,
        tokenBAddress: string,
        amount0: bigint,
        amount1: bigint,
        poolFee: number,
        lowerTick: number,
        upperTick: number,
        deadline?: number,
        slippageTolerance: number = 0.01
    ): MintParams {
        if (!deadline) {
            deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
        }

        return {
            token0: tokenAAddress,
            token1: tokenBAddress,
            fee: poolFee,
            tickLower: lowerTick,
            tickUpper: upperTick,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: BigInt(0), // Could be: BigInt(Math.floor(Number(amount0) * (1 - slippageTolerance)))
            amount1Min: BigInt(0), // Could be: BigInt(Math.floor(Number(amount1) * (1 - slippageTolerance)))
            recipient: this.wallet.address,
            deadline: deadline,
        };
    }

    /**
     * Get all position NFT IDs owned by user
     */
    async getAllUserPositions(): Promise<bigint[]> {
        const balance = await this.nftManager.balanceOf(this.wallet.address);
        const positions: bigint[] = [];
        
        for (let i = 0; i < balance; i++) {
            const tokenId = await this.nftManager.tokenOfOwnerByIndex(this.wallet.address, i);
            positions.push(tokenId);
        }
        
        return positions;
    }

    /**
     * Get liquidity amount for a specific position
     */
    async getPositionLiquidity(nftId: bigint): Promise<bigint> {
        const position: PositionInfo = await this.nftManager.positions(nftId);
        return position.liquidity;
    }

    /**
     * Get full position information
     */
    async getPositionInfo(nftId: bigint): Promise<PositionInfo> {
        const position = await this.nftManager.positions(nftId);
        return {
            nonce: position.nonce,
            operator: position.operator,
            token0: position.token0,
            token1: position.token1,
            fee: position.fee,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            liquidity: position.liquidity,
            feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
            feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
            tokensOwed0: position.tokensOwed0,
            tokensOwed1: position.tokensOwed1,
        };
    }

    /**
     * Close a position by removing all liquidity and collecting tokens
     */
    async closePosition(nftId: bigint): Promise<{
        decreaseTx?: ethers.ContractTransactionResponse;
        collectTx: ethers.ContractTransactionResponse;
    }> {
        const liquidity = await this.getPositionLiquidity(nftId);
        
        const result: {
            decreaseTx?: ethers.ContractTransactionResponse;
            collectTx: ethers.ContractTransactionResponse;
        } = {} as any;

        // Only decrease liquidity if there is any
        if (liquidity > 0) {
            const decreaseParams = {
                tokenId: nftId,
                liquidity: liquidity,
                amount0Min: BigInt(0),
                amount1Min: BigInt(0),
                deadline: Math.floor(Date.now() / 1000) + 600
            };
            
            result.decreaseTx = await this.nftManager.decreaseLiquidity(decreaseParams);
            await result.decreaseTx.wait(); // Wait for decrease to complete
        }

        // Collect any fees and remaining tokens
        const collectParams = {
            tokenId: nftId,
            recipient: this.wallet.address,
            amount0Max: MAX_UINT_128,
            amount1Max: MAX_UINT_128
        };
        
        result.collectTx = await this.nftManager.collect(collectParams);
        
        return result;
    }

    /**
     * Mint a new liquidity position
     */
    async mintPosition(params: MintParams): Promise<ethers.ContractTransactionResponse> {
        // Check and approve tokens if needed
        const nftManagerAddress = await this.nftManager.getAddress();
        
        const token0NeedsApproval = !(await this.checkAllowance(
            params.token0, 
            nftManagerAddress, 
            params.amount0Desired
        ));
        
        const token1NeedsApproval = !(await this.checkAllowance(
            params.token1, 
            nftManagerAddress, 
            params.amount1Desired
        ));

        if (token0NeedsApproval) {
            const approveTx = await this.approveToken(
                params.token0, 
                nftManagerAddress, 
                params.amount0Desired
            );
            await approveTx.wait();
        }

        if (token1NeedsApproval) {
            const approveTx = await this.approveToken(
                params.token1, 
                nftManagerAddress, 
                params.amount1Desired
            );
            await approveTx.wait();
        }

        // Mint the position
        return await this.nftManager.mint(params);
    }

    /**
     * Get wallet address
     */
    getAddress(): string {
        return this.wallet.address;
    }

    /**
     * Get ETH balance
     */
    async getBalance(): Promise<string> {
        const balance = await this.wallet.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
    }
}

/**
 * Initialize Uniswap V3 Position Manager
 */
export const initUniswapV3PositionManager = async (
    runtime: IAgentRuntime,
    nftManagerAddress?: string
): Promise<UniswapV3PositionManager> => {
    const privateKey = runtime.getSetting("ETHEREUM_PRIVATE_KEY");
    if (!privateKey) {
        throw new Error("ETHEREUM_PRIVATE_KEY is missing");
    }
    
    const ethProviderUrl =
        runtime.getSetting("ETHEREUM_PROVIDER_URL") ||
        testnetNetworks['sepolia'].rpcUrl;
    
    const provider = new ethers.JsonRpcProvider(ethProviderUrl);
    
    // Default to mainnet Uniswap V3 NFT Position Manager if not provided
    const defaultNftManager = "0x1238536071E1c677A632429e3655c799b22cDA52";
    const nftManager = nftManagerAddress || defaultNftManager;
    
    return new UniswapV3PositionManager(privateKey, provider, nftManager);
};

/**
 * Provider for getting position information
 */
export const uniswapV3PositionProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            const positionManager = await initUniswapV3PositionManager(runtime);
            const positions = await positionManager.getAllUserPositions();
            
            if (positions.length === 0) {
                return `Uniswap V3 Positions: None found for ${positionManager.getAddress()}`;
            }

            let result = `Uniswap V3 Positions for ${positionManager.getAddress()}:\n`;
            
            for (const positionId of positions) {
                const positionInfo = await positionManager.getPositionInfo(positionId);
                result += `\nPosition ID: ${positionId}\n`;
                result += `  Liquidity: ${positionInfo.liquidity}\n`;
                result += `  Fee Tier: ${positionInfo.fee / 10000}%\n`;
                result += `  Tick Range: ${positionInfo.tickLower} to ${positionInfo.tickUpper}\n`;
                result += `  Tokens Owed: ${ethers.formatUnits(positionInfo.tokensOwed0, 18)} / ${ethers.formatUnits(positionInfo.tokensOwed1, 6)}\n`;
            }
            
            return result;
        } catch (error) {
            return `Error fetching Uniswap positions: ${error}`;
        }
    },
};

// Export types and constants
export { MAX_UINT_128 };

