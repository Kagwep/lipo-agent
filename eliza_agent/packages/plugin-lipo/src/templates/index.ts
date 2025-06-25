export const transferTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested transfer:
- Amount to transfer: Must be a string representing the amount in ETH (only number without coin symbol, e.g., "0.1")
- Recipient address: Must be a valid Swell address starting with "0x"

Respond with a JSON markdown block containing only the extracted values. All fields except 'token' are required:

\`\`\`json
{
    "amount": string,
    "toAddress": string,
}
\`\`\`
`;


export const bridgeTemplate = `Given the recent messages and wallet information below:
{{recentMessages}}
{{walletInfo}}
Extract the following information about the requested bridge operation:
Token to bridge: Must be one of the supported tokens: "ETH", "WETH", "wstETH", "stBTC", "SWELL", "rSWELL", "swBTC", "weETH", "rswETH", "swETH", "ezETH", "pzETH", "rsETH", "USDe", "sUSDe", "ENA", "EUL", "KING", "rUSDC" (default to "ETH" if not specified)
Amount to bridge: Must be a string representing the amount (number without coin symbol, e.g., "0.1")
Source network: Must be one of "ethereum" or "swellchain"
Destination network: Must be one of "ethereum" or "swellchain" (opposite of source)
Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
"token": string,
"amount": string,
"sourceNetwork": string,
"destinationNetwork": string
}
\`\`\`
If the user didn't specify a direction for the bridge (source/destination), use their current connected network as the source and the opposite as destination.
Example responses:
For a user on Ethereum bridge request:
\`\`\`json
{
"token": "ETH",
"amount": "0.1",
"sourceNetwork": "ethereum",
"destinationNetwork": "swellchain"
}
\`\`\`
For a user on Swellchain bridge request:
\`\`\`json
{
"token": "wstETH",
"amount": "0.5",
"sourceNetwork": "swellchain",
"destinationNetwork": "ethereum"
}
\`\`\`
If any required field cannot be determined, use the following defaults:
Token: "ETH"
Amount: null (requires user clarification)
Source: Current connected network
Destination: Opposite of source network
`;


export const priceOracleTemplate = `Given the recent messages and wallet information below:
{{recentMessages}}
{{walletInfo}}

Extract the following information about the requested price oracle query:
- Trading pair: Must be one of "ETH/USDC", "wstETH/stETH", "swETH/ETH", "rswETH/ETH", "weETH/ETH", "USDe/USDC", "USDC", "USDT" (default to "ETH/USDC" if not specified)
- Timestamp required: Boolean indicating if the user specifically wants timestamp information (default to false)
- Historical data: Boolean indicating if the user wants historical data rather than just current price (default to false)

Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
    "tradingPair": string,
    "timestampRequired": boolean,
    "historicalData": boolean
}
\`\`\`

If the trading pair cannot be determined or does not match one of the supported pairs, default to "ETH/USDC".

Example responses:
1. For a simple price request:
\`\`\`json
{
    "tradingPair": "ETH/USDC",
    "timestampRequired": false,
    "historicalData": false
}
\`\`\`

2. For a timestamp-inclusive request:
\`\`\`json
{
    "tradingPair": "USDT",
    "timestampRequired": true,
    "historicalData": false
}
\`\`\`

3. For a historical data request:
\`\`\`json
{
    "tradingPair": "swETH/ETH",
    "timestampRequired": true,
    "historicalData": true
}
\`\`\`

Special handling notes:
- Users may refer to trading pairs in various formats (e.g., "ETH/USDC", "ETH-USDC", "ETH to USDC", "ETH USDC price")
- For single token references like "USDT" or "USDC", use the matching single token price feed
- If a user mentions "time", "when", "updated", or similar terms, set timestampRequired to true
- If a user mentions "history", "historical", "over time", "chart", "graph", or similar terms, set historicalData to true
`;

export const earningOpportunitiesTemplate = `Given the recent messages and wallet information below:
{{recentMessages}}
{{walletInfo}}

Extract the following information about the requested earning opportunities:
- Filter type: Must be one of "ALL", "LIVE", "LEND", "BORROW", "POOL", "HOLD" (default to "ALL" if not specified)
- Specified APR: A minimum APR value if the user mentions one (default to null)
- Specific token: Any token the user is interested in earning with (default to null)
- Sort by: How the user wants results sorted - "APR", "TVL", or "REWARDS" (default to null)
- Details request: Boolean indicating if user wants detailed information about a specific opportunity (default to false)
- Opportunity ID: Specific opportunity ID if user is requesting details (default to null)

Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
    "filterType": string,
    "minApr": number | null,
    "token": string | null,
    "sortBy": string | null,
    "detailsRequest": boolean,
    "opportunityId": string | null
}
\`\`\`

Example responses:
1. For a general request to view all opportunities:
\`\`\`json
{
    "filterType": "ALL",
    "minApr": null,
    "token": null,
    "sortBy": null, 
    "detailsRequest": false,
    "opportunityId": null
}
\`\`\`

2. For a filtered request:
\`\`\`json
{
    "filterType": "LEND",
    "minApr": 5.0,
    "token": "ETH",
    "sortBy": "APR",
    "detailsRequest": false,
    "opportunityId": null
}
\`\`\`

3. For a detailed opportunity request:
\`\`\`json
{
    "filterType": "ALL",
    "minApr": null,
    "token": null,
    "sortBy": null,
    "detailsRequest": true,
    "opportunityId": "opportunity-123"
}
\`\`\`

Special handling notes:
- The user might use various terms for earning opportunities ("staking", "yield farming", "lending", "earning", etc.)
- For APR, look for terms like "at least", "minimum", "above", etc. followed by a percentage
- For token filtering, users might mention "ETH", "USDT", or other tokens they want to earn with or deposit
- For detailed view requests, look for phrases like "tell me more about", "details on", "show me", etc.
- If the user mentions sorting, look for terms like "highest APR", "most rewards", "largest TVL", etc.
`;


export const swapTemplate = `Given the recent messages and wallet information below:
{{recentMessages}}
{{walletInfo}}

Extract the following information about the requested token swap operation:

Token to sell (tokenIn): The token symbol the user wants to sell
Token to buy (tokenOut): The token symbol the user wants to receive
Amount to sell: Must be a string representing the amount (number without coin symbol, e.g., "0.1")
Slippage tolerance: Percentage tolerance for price changes (default to "0.5" for 0.5%)

Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
  "tokenIn": string,
  "tokenOut": string,
  "amountIn": string,
  "slippage": string
}
\`\`\`

Available token symbols on Swellchain:
- ETH (native token)
- WETH
- earnETH
- ENA
- pzETH
- rsETH
- rSWELL
- ezETH
- USDe
- msETH
- NEP
- rswETH
- stBTC
- SURF
- sUSDe
- swBTC
- SWELL
- swETH
- uBTC
- weETH
- wstETH

If the user doesn't specify one of the required values, use these defaults:
- tokenIn: ETH (native token)
- tokenOut: SWELL if tokenIn is not SWELL, otherwise ETH
- amountIn: null (requires user clarification)
- slippage: "0.5"

Example responses:
For a swap request of ETH to SWELL:
\`\`\`json
{
  "tokenIn": "ETH",
  "tokenOut": "SWELL",
  "amountIn": "0.1",
  "slippage": "0.5"
}
\`\`\`

For a swap request of USDT to swETH:
\`\`\`json
{
  "tokenIn": "USDe",
  "tokenOut": "swETH",
  "amountIn": "100",
  "slippage": "0.3"
}
\`\`\`
`;

export const earnETHTemplate = `Given the recent messages and wallet information below:
{{recentMessages}}
{{walletInfo}}

Extract the following information about the requested earn eth operation:

Operation type: Must be one of "deposit" or "withdraw"
Token: Must be one of the supported assets ("ezETH", "rswETH", "swETH", "weETH", "wstETH" for deposits, or the destination asset for withdrawals)
Amount: Must be a string representing the amount (number without token symbol, e.g., "0.1")
Slippage tolerance: Must be a number representing percentage (default to "1.0" if not specified)

Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
  "operation": string,
  "token": string,
  "amount": string,
  "slippage": string
}
\`\`\`

If the user didn't specify an amount, set amount to null to prompt for clarification.
If the user didn't specify a token for deposit, default to "ezETH".
If the user didn't specify a token for withdrawal, default to "ezETH".

Example responses:
For a deposit request:
\`\`\`json
{
  "operation": "deposit",
  "token": "ezETH",
  "amount": "0.5",
  "slippage": "1.0"
}
\`\`\`

For a withdrawal request:
\`\`\`json
{
  "operation": "withdraw",
  "token": "wstETH",
  "amount": "0.1",
  "slippage": "0.5"
}
\`\`\`

If any required field cannot be determined, use the following defaults:
Operation: null (requires user clarification)
Token: "ezETH"
Amount: null (requires user clarification)
Slippage: "1.0"
`;