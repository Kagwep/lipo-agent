//network interface
export interface NetworkInfo {
    name: string;
    chainId: number;
    bridgeAddress: string;
    rpcUrl: string;
    blockExplorer: string;
  }
  
  // token interface
  export interface Token {
    address: string;
    decimals: number;
    l1Address?: string; // Address on Ethereum
    l2Address?: string; // Address on Swellchain
  }
  
  // supported tokens interface
  export interface SupportedTokens {
    [key: string]: Token;
  }

  // Define types based on the actual data structure from the API
export type TokenEarn = {
  id?: string;
  name: string;
  chainId?: number;
  address: string;
  decimals: number;
  icon?: string;
  verified?: boolean;
  symbol: string;
  price?: number;
  displaySymbol?: string;
};

export type Chain = {
  id: number;
  name: string;
  icon?: string;
  Explorer?: Array<{
    id?: string;
    type?: string;
    url: string;
    chainId?: number;
  }>;
};

export type Protocol = {
  id?: string;
  tags?: string[];
  name: string;
  description?: string;
  url?: string;
  icon?: string;
};

export type RewardBreakdown = {
  token: Token;
  amount: string;
  value?: number;
  distributionType?: string;
};

export type Opportunity = {
  chainId: number;
  type?: string;
  identifier?: string;
  name: string;
  status?: string;
  action?: string;
  tvl: number;
  apr: number;
  dailyRewards: number;
  tags?: string[];
  id: string;
  depositUrl?: string;
  explorerAddress?: string;
  tokens: TokenEarn[];
  chain: Chain;
  protocol?: Protocol;
  rewardsBreakdown?: RewardBreakdown[];
};

export type QuoteResponse = {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountInUsd: number;
  amountOut: string;
  amountOutUsd: number;
  minAmountOut: string;
  splits: {
      amountIn: string;
      amountOut: string;
      swaps: Array<{
          tokenIn: string;
          tokenOut: string;
          amountIn: string;
          amountOut: string;
          pool: string;
          exchange: string;
          type: string;
          data: any;
      }>;
  }[];
};

export type SwapResponse = {
  quote: QuoteResponse;
  tx: {
      data: string;
      router: string;
  };
};