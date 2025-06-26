// Template 1: Pure Prediction/Analysis
export const predictionTemplate = `Given the recent messages and wallet information below:
{{recentMessages}}
{{walletInfo}}

Extract the following information about the requested liquidity prediction/analysis:

Token pair to analyze: Must be one of the supported pairs: "LINKUSDT", "UNIUSDT", "AAVEUSDT", "SUSHIUSDT", "1INCHUSDT" (default to "LINKUSDT" if not specified)
Number of days: Must be a number between 1 and 365 for historical data analysis (default to 30 if not specified)
Include sentiment analysis: Must be a boolean indicating whether to include market sentiment in the analysis (default to false if not specified)
Analysis type: Must be one of "volatility", "liquidity", "full" - what type of analysis to perform (default to "volatility" if not specified)

Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
  "tokenPair": string,
  "days": number,
  "includeSentiment": boolean,
  "analysisType": string
}
\`\`\`

Common user phrases for prediction requests:
- "predict", "forecast", "analyze", "check volatility"
- "what's the volatility of LINK?"
- "analyze UNI for the last week"
- "full analysis of AAVE with sentiment"
`;

// Template 2: Rebalancing Actions
export const rebalanceTemplate = `Given the recent messages and wallet information below:
{{recentMessages}}
{{walletInfo}}

Extract the following information about the requested rebalancing operation:

Token pair to rebalance: Must be one of the supported pairs: "LINKUSDT", "UNIUSDT", "AAVEUSDT", "SUSHIUSDT", "1INCHUSDT" (default to "LINKUSDT" if not specified)
Volatility threshold: Must be one of "LOW", "MODERATE", "HIGH", "EXTREME" - rebalance only if current volatility is above this level (default to "MODERATE" if not specified)
Custom volatility limit: Optional number representing custom volatility percentage threshold (e.g., 5.5 for 5.5%)
Rebalance action: Must be one of "reduce_exposure", "increase_exposure", "exit_position", "auto_optimize" (default to "auto_optimize")
Confirmation required: Must be a boolean indicating whether to ask for user confirmation before executing (default to true)

Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
  "tokenPair": string,
  "volatilityThreshold": string,
  "customVolatilityLimit": number | null,
  "rebalanceAction": string,
  "confirmationRequired": boolean
}
\`\`\`

Example responses:

For automatic rebalancing with standard thresholds:
\`\`\`json
{
  "tokenPair": "LINKUSDT",
  "volatilityThreshold": "HIGH",
  "customVolatilityLimit": null,
  "rebalanceAction": "auto_optimize",
  "confirmationRequired": true
}
\`\`\`

For custom volatility limit:
\`\`\`json
{
  "tokenPair": "UNIUSDT",
  "volatilityThreshold": "MODERATE",
  "customVolatilityLimit": 7.5,
  "rebalanceAction": "reduce_exposure",
  "confirmationRequired": false
}
\`\`\`

For immediate exit:
\`\`\`json
{
  "tokenPair": "AAVEUSDT",
  "volatilityThreshold": "EXTREME",
  "customVolatilityLimit": null,
  "rebalanceAction": "exit_position",
  "confirmationRequired": true
}
\`\`\`

Common user phrases for rebalancing:
- "rebalance", "adjust position", "optimize"
- "reduce exposure if volatility above 8%"
- "exit LINK if volatility is extreme"
- "auto-optimize UNI position"
- "rebalance without confirmation"
- Volatility thresholds:
  - "low risk", "conservative" → "LOW" (< 2%)
  - "moderate", "medium" → "MODERATE" (2-5%)
  - "high risk", "aggressive" → "HIGH" (5-10%)
  - "extreme", "very high" → "EXTREME" (> 10%)

If any required field cannot be determined, use these defaults:
- Token pair: "LINKUSDT"
- Volatility threshold: "MODERATE"
- Custom volatility limit: null
- Rebalance action: "auto_optimize"
- Confirmation required: true
`;
