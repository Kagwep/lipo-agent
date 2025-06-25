import { SupportedTokens } from "../types";

// Testnet  tokens -bridge
export const supportedTestnetTokens: SupportedTokens = {
    'ETH': { 
      address: 'native', 
      decimals: 18 
    },
    'WETH': { 
      address: 'native', 
      decimals: 18,
      l1Address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH on Sepolia
      l2Address: '0x4200000000000000000000000000000000000006'  // L2 WETH on Swellchain Testnet
    },
    'USDT': { 
      address: 'native', 
      decimals: 6,
      l1Address: '0xfd665f836095Ed02fDBF3C4F24174D70DFD6b69c', // USDT on Sepolia from docs
      l2Address: '0x41a0bD84E65e75Bc30AFBbe6ea142eBBcc347542'  // USDT on Swellchain Testnet from docs
    }
  };

  // Mainnet tokens - bridge
export const supportedMainnetTokens: SupportedTokens = {
  'ETH': { 
    address: 'native', 
    decimals: 18 
  },
  'WETH': { 
    address: 'native', 
    decimals: 18,
    l1Address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum Mainnet
    l2Address: '0x4200000000000000000000000000000000000006'  // L2 WETH on Swellchain Mainnet
  },
  'stBTC': {
    address: 'native',
    decimals: 18,
    l1Address: '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3', // Lorenzo stBTC on Ethereum
    l2Address: '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3' // Lorenzo stBTC on Swellchain
  },
  'SWELL': {
    address: 'native',
    decimals: 18,
    l1Address: '0x0a6E7Ba5042B38349e437ec6Db6214AEC7B35676', // Swell Governance Token on Ethereum
    l2Address: '0x2826D136F5630adA89C1678b64A61620Aab77Aea' // Swell Governance Token on Swellchain
  },
  'rSWELL': {
    address: 'native',
    decimals: 18,
    l1Address: '0x358d94b5b2F147D741088803d932Acb566acB7B6', // rSWELL on Ethereum
    l2Address: '0x939f1cC163fDc38a77571019eb4Ad1794873bf8c' // rSWELL on Swellchain
  },
  'swBTC': {
    address: 'native',
    decimals: 8, // Note: This is 8 decimals, not 18
    l1Address: '0x8DB2350D78aBc13f5673A411D4700BCF87864dDE', // swBTC on Ethereum
    l2Address: '0x1cf7b5f266A0F39d6f9408B90340E3E71dF8BF7B' // swBTC on Swellchain
  },
  'weETH': {
    address: 'native',
    decimals: 18,
    l1Address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee', // Wrapped eETH on Ethereum
    l2Address: '0xA6cB988942610f6731e664379D15fFcfBf282b44' // Wrapped eETH on Swellchain
  },
  'rswETH': {
    address: 'native',
    decimals: 18,
    l1Address: '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0', // rswETH on Ethereum
    l2Address: '0x18d33689AE5d02649a859A1CF16c9f0563975258' // rswETH on Swellchain
  },
  'swETH': {
    address: 'native',
    decimals: 18,
    l1Address: '0xf951E335afb289353dc249e82926178EaC7DEd78', // swETH on Ethereum
    l2Address: '0x09341022ea237a4DB1644DE7CCf8FA0e489D85B7' // swETH on Swellchain
  },
  'ezETH': {
    address: 'native',
    decimals: 18,
    l1Address: '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110', // Renzo Restaked ETH on Ethereum
    l2Address: '0x2416092f143378750bb29b79eD961ab195CcEea5' // Renzo Restaked ETH on Swellchain
  },
  'pzETH': {
    address: 'native',
    decimals: 18,
    l1Address: '0x8c9532a60E0E7C6BbD2B2c1303F63aCE1c3E9811', // Renzo Restaked LST on Ethereum
    l2Address: '0x9cb41CD74D01ae4b4f640EC40f7A60cA1bCF83E7' // Renzo Restaked LST on Swellchain
  },
  'rsETH': {
    address: 'native',
    decimals: 18,
    l1Address: '0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7', // KelpDao Restaked ETH on Ethereum
    l2Address: '0xc3eACf0612346366Db554C991D7858716db09f58' // KelpDao Restaked ETH on Swellchain
  },
  'wstETH': {
    address: 'native',
    decimals: 18,
    l1Address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', // wstETH on Ethereum
    l2Address: '0x7c98E0779EB5924b3ba8cE3B17648539ed5b0Ecc' // wstETH on Swellchain
  },
  'USDe': {
    address: 'native',
    decimals: 18,
    l1Address: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3', // USDe on Ethereum
    l2Address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34' // USDe on Swellchain
  },
  'sUSDe': {
    address: 'native',
    decimals: 18,
    l1Address: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497', // Staked USDe on Ethereum
    l2Address: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2' // Staked USDe on Swellchain
  },
  'ENA': {
    address: 'native',
    decimals: 18,
    l1Address: '0x57e114B691Db790C35207b2e685D4A43181e6061', // ENA on Ethereum
    l2Address: '0x58538e6A46E07434d7E7375Bc268D3cb839C0133' // ENA on Swellchain
  },
  'EUL': {
    address: 'native',
    decimals: 18,
    l1Address: '0xd9Fcd98c322942075A5C3860693e9f4f03AAE07b', // Euler on Ethereum
    l2Address: '0x80ccFBec4b8c82265abdc226Ad3Df84C0726E7A3' // Euler on Swellchain
  },
  'KING': {
    address: 'native',
    decimals: 18,
    l1Address: '0x8F08B70456eb22f6109F57b8fafE862ED28E6040', // King Protocol on Ethereum
    l2Address: '0xc2606AADe4bdd978a4fa5a6edb3b66657acEe6F8' // King Protocol on Swellchain
  },
  'rUSDC': {
    address: 'native',
    decimals: 6,
    l1Address: '0xCB35Be279968F6c53EBF73c8d9D5d7AAf4d34956', // Relend Network USDC on Ethereum
    l2Address: '0x9ab96A4668456896d45c301Bc3A15Cee76AA7B8D' // Relend Network USDC on Swellchain
  }
};

  export const neptune = {
    tokens: {
      earnETH: "0x9Ed15383940CC380fAEF0a75edacE507cC775f22",
      ENA: "0x58538e6A46E07434d7E7375Bc268D3cb839C0133",
      pzETH: "0x9cb41CD74D01ae4b4f640EC40f7A60cA1bCF83E7",
      rsETH: "0xc3eACf0612346366Db554C991D7858716db09f58",
      rSWELL: "0x939f1cC163fDc38a77571019eb4Ad1794873bf8c",
      ezETH: "0x2416092f143378750bb29b79eD961ab195CcEea5",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
      msETH: "0x4661407fC224E5432D7f528a20EF8906E453A8f3",
      NEP: "0xEa34479f7d95341E5fd49b89936366D6da710824",
      rswETH: "0x18d33689AE5d02649a859A1CF16c9f0563975258",
      stBTC: "0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3",
      SURF: "0x8169c783b5e930f189b06a97f85A1524A9822B2C",
      sUSDe: "0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2",
      swBTC: "0x1cf7b5f266A0F39d6f9408B90340E3E71dF8BF7B",
      SWELL: "0x2826D136F5630adA89C1678b64A61620Aab77Aea",
      swETH: "0x09341022ea237a4DB1644DE7CCf8FA0e489D85B7",
      uBTC: "0xb5668713E9BA8bC96f97D691663E70b54CE90b0A",
      weETH: "0xA6cB988942610f6731e664379D15fFcfBf282b44",
      WETH: "0x4200000000000000000000000000000000000006",
      ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      wstETH: "0x7c98E0779EB5924b3ba8cE3B17648539ed5b0Ecc"
    },}


    export const NEPTUNE_TOKEN_DECIMALS = {
      swBTC: 8,
      default: 18
  };


  // earnETH tokens information
export const earnETHTokens = {
  // Contract addresses
  addresses: {
    TELLER: "0x6D207874DDc8B1C3954a0BB2b21c6Fce2Aa18Dba",
    VAULT: "0x9Ed15383940CC380fAEF0a75edacE507cC775f22"
  },
  // Supported deposit tokens
  supportedTokens: {
    ezETH: {
      name: "Renzo Restaked ETH",
      symbol: "ezETH",
      address: "0x2416092f143378750bb29b79eD961ab195CcEea5",
      decimals: 18
    },
    rswETH: {
      name: "Restaked Swell ETH",
      symbol: "rswETH",
      address: "0x18d33689AE5d02649a859A1CF16c9f0563975258",
      decimals: 18
    },
    swETH: {
      name: "Swell ETH",
      symbol: "swETH",
      address: "0x09341022ea237a4DB1644DE7CCf8FA0e489D85B7",
      decimals: 18
    },
    weETH: {
      name: "Wrapped eETH",
      symbol: "weETH",
      address: "0xA6cB988942610f6731e664379D15fFcfBf282b44",
      decimals: 18
    },
    wstETH: {
      name: "Wrapped liquid staked Ether 2.0",
      symbol: "wstETH",
      address: "0x7c98E0779EB5924b3ba8cE3B17648539ed5b0Ecc",
      decimals: 18
    }
  }
};

// Convert the supportedTokens object to an array for the UI
export const ASSETS = Object.values(earnETHTokens.supportedTokens);