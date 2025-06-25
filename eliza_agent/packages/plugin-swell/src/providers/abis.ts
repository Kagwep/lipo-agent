// ABI for StandardBridge (works for both L1 and L2)
export const StandardBridgeABI = [
    // Bridge ETH
    "function bridgeETH(uint32 _minGasLimit, bytes _extraData) payable",
    "function bridgeETHTo(address _to, uint32 _minGasLimit, bytes _extraData) payable",
    
    // Bridge ERC20
    "function bridgeERC20(address _localToken, address _remoteToken, uint256 _amount, uint32 _minGasLimit, bytes _extraData)",
    "function bridgeERC20To(address _localToken, address _remoteToken, address _to, uint256 _amount, uint32 _minGasLimit, bytes _extraData)"
  ];
  
  // ABI for ERC20
export const ERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];

  export const ERC20ABI_E = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)"
  ];


  export const PriceOracleABI = [
    // Get the latest price
    {
      "inputs": [],
      "name": "latestAnswer",
      "outputs": [{"internalType": "int256", "name": "", "type": "int256"}],
      "stateMutability": "view",
      "type": "function"
    },
    // Get decimals
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
      "stateMutability": "view",
      "type": "function"
    },
    // Get latest round data
    {
      "inputs": [],
      "name": "latestRoundData",
      "outputs": [
        {"internalType": "uint80", "name": "roundId", "type": "uint80"},
        {"internalType": "int256", "name": "answer", "type": "int256"},
        {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
        {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
        {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  export const erc20Abi = [
    {
      "constant": true,
      "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}],
      "name": "allowance",
      "outputs": [{"name": "remaining", "type": "uint256"}],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
      "name": "approve",
      "outputs": [],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]


  
 export const TellerABI = [
    "function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint) returns (uint256)",
    "function bulkWithdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256)",
    "function isSupported(address) view returns (bool)"
  ];
  
  export const VaultABI = [
    "function balanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)"
  ];
  