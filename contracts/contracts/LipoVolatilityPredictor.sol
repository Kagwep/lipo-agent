// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {FunctionsClient} from "@chainlink/contracts@1.4.0/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts@1.4.0/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts@1.4.0/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title LipoVolatilityPredictor
 * @notice Gas-efficient volatility prediction using ML models via Chainlink Functions
 * @dev Uses ABI encoding/decoding for maximum efficiency
 */
contract LipoVolatilityPredictor is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // State variables
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;
    
    uint256 public predictedVolatility;    // Scaled by 1e6 (0.25 = 250000)
    uint256 public lastUpdateTimestamp;    // When data was last updated
    
    // Trading thresholds
    mapping(string => uint256) public volatilityThresholds;

    // Events
    event VolatilityUpdated(
        bytes32 indexed requestId,
        uint256 predictedVolatility,
        uint256 timestamp
    );
    
    event ThresholdUpdated(string volatilityLevel, uint256 newThreshold);

    // Custom errors
    error UnexpectedRequestID(bytes32 requestId);

    // Chainlink configuration - Sepolia testnet
    address router = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    bytes32 donID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;
    uint32 gasLimit = 300000;

    // JavaScript source - just return predicted volatility as number
    string source =
        "const days = args[0].toString() || '30';"
        "const response = await Functions.makeHttpRequest({"
        "url: 'https://o9r0ju4pg2.execute-api.eu-north-1.amazonaws.com/dev/lipo_volatility_predict',"
        "method: 'POST',"
        "headers: {'Content-Type': 'application/json'},"
        "data: {days: days}"
        "});"
        "if (response.error) {"
        "console.log('Error:', response.error);"
        "throw Error('Request failed');"
        "}"
        "const result = response.data;"
        "const prediction = result.prediction || {};"
        "const predictedVol = Math.floor((prediction.predicted_volatility_5d || 0) * 1e6);"
        "console.log('Predicted Vol:', predictedVol);"
        "return Functions.encodeUint256(predictedVol);";

    /**
     * @notice Initialize contract with default volatility thresholds
     */
    constructor() FunctionsClient(router) ConfirmedOwner(msg.sender) {
        // Set default volatility thresholds (basis points, 100 = 1%)
        volatilityThresholds["LOW"] = 500;     // 5%
        volatilityThresholds["MEDIUM"] = 1000; // 10%
        volatilityThresholds["HIGH"] = 2000;   // 20%
    }

    /**
     * @notice Send request with arguments
     * @param subscriptionId Chainlink subscription ID  
     * @param args Arguments array (e.g., ["30"] for 30 days, or [] for default 30)
     */
    function sendRequest(
        uint64 subscriptionId,
        string[] calldata args
    ) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (args.length > 0) req.setArgs(args);

        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );

        return s_lastRequestId;
    }

    /**
     * @notice Callback function - decode uint256
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }

        s_lastResponse = response;
        s_lastError = err;
        lastUpdateTimestamp = block.timestamp;

        if (response.length > 0) {
            // Decode uint256 - predicted volatility
            predictedVolatility = abi.decode(response, (uint256));
        }

        emit VolatilityUpdated(
            requestId,
            predictedVolatility,
            lastUpdateTimestamp
        );
    }

    /**
     * @notice Check if current volatility suggests rebalancing
     */
    function shouldRebalancePosition() external view returns (bool shouldRebalance, uint256 volatilityValue) {
        volatilityValue = predictedVolatility;
        
        // Rebalance if volatility > 20% (200000 = 0.20 * 1e6) or data is stale
        shouldRebalance = (
            predictedVolatility > 200000 ||
            block.timestamp - lastUpdateTimestamp > 3600
        );
    }

    /**
     * @notice Get current volatility data
     */
    function getCurrentVolatility() external view returns (
        uint256 volatility,
        uint256 timestamp
    ) {
        return (predictedVolatility, lastUpdateTimestamp);
    }

    /**
     * @notice Get predicted volatility as percentage (with 4 decimals)
     */
    function getPredictedVolatilityPercent() external view returns (uint256) {
        return predictedVolatility / 10000; // 250000 / 10000 = 25.0000%
    }

    /**
     * @notice Check if volatility data is fresh
     */
    function isDataFresh() external view returns (bool isFresh) {
        return block.timestamp - lastUpdateTimestamp <= 3600; // 1 hour
    }

    /**
     * @notice Update volatility threshold for trading decisions
     */
    function updateVolatilityThreshold(
        string memory volatilityLevel,
        uint256 threshold
    ) external onlyOwner {
        volatilityThresholds[volatilityLevel] = threshold;
        emit ThresholdUpdated(volatilityLevel, threshold);
    }

    /**
     * @notice Update gas limit for Chainlink Functions
     */
    function updateGasLimit(uint32 newGasLimit) external onlyOwner {
        gasLimit = newGasLimit;
    }
}