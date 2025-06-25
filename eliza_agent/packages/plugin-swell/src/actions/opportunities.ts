import {
    type Action,
    composeContext,
    generateObjectDeprecated,
    type IAgentRuntime,
    ModelClass,
    type State,
} from "@elizaos/core";
import { initSwellWalletProvider, type WalletProvider } from "../providers/wallet";
import { earningOpportunitiesTemplate } from "../templates";
import { Opportunity, RewardBreakdown } from "../types";
import { formatOpportunitiesWithEmoji } from "../utils";



type EarningOpportunitiesFilter = {
  filter?: string;
  chainId?: number;
  status?: string;
  action?: string;
  minApr?: number;
  tags?: string[];
};

export class EarningOpportunitiesAction {
    private opportunities: Opportunity[] = [];
    
    constructor() {}
    
    async fetchOpportunities(): Promise<Opportunity[]> {
        try {
            const response = await fetch('https://api.merkl.xyz/v4/opportunities?tags=swell');
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transform the data to match our expected format
            this.opportunities = data.map((opp: any) => {
                // Extract rewards breakdown from the rewards record if it exists
                let rewardsBreakdown: RewardBreakdown[] = [];
                if (opp.rewardsRecord && opp.rewardsRecord.breakdowns) {
                    rewardsBreakdown = opp.rewardsRecord.breakdowns.map((breakdown: any) => ({
                        token: breakdown.token,
                        amount: breakdown.amount,
                        value: breakdown.value,
                        distributionType: breakdown.distributionType
                    }));
                }
                
                return {
                    id: opp.id,
                    chainId: opp.chainId,
                    name: opp.name,
                    type: opp.type,
                    status: opp.status,
                    action: opp.action,
                    tvl: opp.tvl || 0,
                    apr: opp.apr || 0,
                    dailyRewards: opp.dailyRewards || 0,
                    tags: opp.tags || [],
                    depositUrl: opp.depositUrl,
                    explorerAddress: opp.explorerAddress,
                    tokens: opp.tokens || [],
                    chain: opp.chain,
                    protocol: opp.protocol,
                    rewardsBreakdown
                };
            });
            
            return this.opportunities;
        } catch (error) {
            console.error("Error fetching opportunities:", error);
            throw new Error(`Failed to fetch earning opportunities: ${error.message}`);
        }
    }
    
    getOpportunityById(id: string): Opportunity | undefined {
        return this.opportunities.find(opp => opp.id === id);
    }
    
    // Method to get all available opportunities
    async listOpportunities() {
        if (this.opportunities.length === 0) {
            await this.fetchOpportunities();
        }
        return this.opportunities;
    }
    
    // Method to get filtered opportunities
    async getFilteredOpportunities(filterOptions: EarningOpportunitiesFilter = {}) {
        if (this.opportunities.length === 0) {
            await this.fetchOpportunities();
        }
        
        let filteredOpps = [...this.opportunities];
        
        // Apply simple filter (ALL, LIVE, LEND, etc.)
        if (filterOptions.filter && filterOptions.filter !== 'ALL') {
            filteredOpps = filteredOpps.filter(opp => 
                opp.status === filterOptions.filter || 
                opp.action === filterOptions.filter || 
                opp.tags?.includes(filterOptions.filter)
            );
        }
        
        // Apply chain ID filter
        if (filterOptions.chainId) {
            filteredOpps = filteredOpps.filter(opp => opp.chainId === filterOptions.chainId);
        }
        
        // Apply status filter
        if (filterOptions.status) {
            filteredOpps = filteredOpps.filter(opp => opp.status === filterOptions.status);
        }
        
        // Apply action filter
        if (filterOptions.action) {
            filteredOpps = filteredOpps.filter(opp => opp.action === filterOptions.action);
        }
        
        // Apply minimum APR filter
        if (filterOptions.minApr !== undefined) {
            filteredOpps = filteredOpps.filter(opp => opp.apr >= filterOptions.minApr);
        }
        
        // Apply tags filter
        if (filterOptions.tags && filterOptions.tags.length > 0) {
            filteredOpps = filteredOpps.filter(opp => 
                opp.tags?.some(tag => filterOptions.tags.includes(tag))
            );
        }
        
        return filteredOpps;
    }
    
    // Method to sort opportunities by APR, TVL, or dailyRewards
    sortOpportunities(opportunities: Opportunity[], sortBy: string, ascending: boolean = false): Opportunity[] {
        const sortedOpps = [...opportunities];
        
        const sortMultiplier = ascending ? 1 : -1;
        
        switch (sortBy.toLowerCase()) {
            case 'apr':
                sortedOpps.sort((a, b) => sortMultiplier * (a.apr - b.apr));
                break;
            case 'tvl':
                sortedOpps.sort((a, b) => sortMultiplier * (a.tvl - b.tvl));
                break;
            case 'rewards':
            case 'dailyrewards':
                sortedOpps.sort((a, b) => sortMultiplier * (a.dailyRewards - b.dailyRewards));
                break;
            default:
                // Default sort by APR descending
                sortedOpps.sort((a, b) => -1 * (a.apr - b.apr));
        }
        
        return sortedOpps;
    }
    
    // Method to get opportunities by protocol
    async getOpportunitiesByProtocol(protocolName: string) {
        if (this.opportunities.length === 0) {
            await this.fetchOpportunities();
        }
        
        return this.opportunities.filter(opp => 
            opp.protocol?.name.toLowerCase() === protocolName.toLowerCase()
        );
    }
    
    // Method to get top opportunities by APR
    async getTopOpportunitiesByApr(limit: number = 5) {
        if (this.opportunities.length === 0) {
            await this.fetchOpportunities();
        }
        
        return [...this.opportunities]
            .filter(opp => opp.status === 'LIVE')
            .sort((a, b) => b.apr - a.apr)
            .slice(0, limit);
    }
    
    // Method to format APR for display
    formatApr(apr: number): string {
        return `${apr.toFixed(2)}%`;
    }
    
    // Method to format currency amounts
    formatAmount(amount: string | number, decimals: number, symbol: string): string {
        let numericAmount: number;
        
        if (typeof amount === 'string') {
            numericAmount = parseFloat(amount) / Math.pow(10, decimals);
        } else {
            numericAmount = amount;
        }
        
        return `${numericAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`;
    }
}

// Define parameter type for filtering options
type ListEarningOpportunitiesOptions = {
    filter?: string;
    chainId?: number;
    sortBy?: string;
    ascending?: boolean;
    limit?: number;
    minApr?: number;
    protocol?: string;
};

// Action to list available earning opportunities
export const listEarningOpportunitiesAction: Action = {
    name: "listEarningOpportunities",
    description: "List available earning opportunities on Swellchain",
    handler: async (runtime, _message, _state, options, callback) => {
        const action = new EarningOpportunitiesAction();
        
        try {
            // Parse options with defaults
            const filterOptions: EarningOpportunitiesFilter = {};
            const listOptions: ListEarningOpportunitiesOptions = options || {};
            
            if (listOptions.filter) {
                filterOptions.filter = listOptions.filter;
            }
            
            if (listOptions.chainId) {
                filterOptions.chainId = listOptions.chainId;
            }
            
            if (listOptions.minApr) {
                filterOptions.minApr = listOptions.minApr;
            }
            
            // Get opportunities based on filters
            let opportunities = await action.getFilteredOpportunities(filterOptions);
            
            // If protocol filter is specified, further filter by protocol
            if (listOptions.protocol) {
                opportunities = opportunities.filter(opp => 
                    opp.protocol?.name.toLowerCase() === listOptions.protocol.toLowerCase()
                );
            }
            
            // Sort if requested
            if (listOptions.sortBy) {
                opportunities = action.sortOpportunities(
                    opportunities, 
                    listOptions.sortBy, 
                    listOptions.ascending || false
                );
            } else {
                // Default sort by APR descending
                opportunities = action.sortOpportunities(opportunities, 'apr', false);
            }
            
            // Apply limit if specified
            if (listOptions.limit && listOptions.limit > 0) {
                opportunities = opportunities.slice(0, listOptions.limit);
            }
            
            if (callback) {

                
                let responseTitle = `Here are the${filterOptions.filter && filterOptions.filter.toLowerCase() === 'lend' ? ' current lending' : ''} opportunities on Swellchain:`;
                
                const formattedText = formatOpportunitiesWithEmoji(opportunities);
                
                // Add a footer with additional information
                const footer = "\nThese rates adjust based on market conditions. Want me to filter for specific types of opportunities?";
                
                // Combine all parts into a complete formatted message
                const responseText = `${responseTitle}\n\n${formattedText}\n\n${footer}`;
                
                callback({
                    text: responseText,
                    content: {
                        success: true,
                        opportunitiesCount: opportunities.length,
                        opportunities: opportunities.map(opp => ({
                            id: opp.id,
                            name: opp.name,
                            apr: opp.apr,
                            aprFormatted: action.formatApr(opp.apr),
                            tvl: opp.tvl,
                            dailyRewards: opp.dailyRewards,
                            status: opp.status,
                            action: opp.action,
                            protocol: opp.protocol?.name,
                            depositUrl: opp.depositUrl,
                            tokens: opp.tokens.map(token => ({
                                symbol: token.symbol,
                                name: token.name,
                                address: token.address
                            })),
                            tags: opp.tags
                        }))
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error listing earning opportunities:", error);
            if (callback) {
                callback({
                    text: `Error listing earning opportunities: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    validate: async () => {
        // No wallet needed for listing opportunities, always valid
        return true;
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll show you the current earning opportunities on Swellchain",
                    action: "LIST_EARNING_OPPORTUNITIES",
                },
            },
            {
                user: "user",
                content: {
                    text: "Show me earning opportunities",
                    action: "LIST_EARNING_OPPORTUNITIES",
                },
            },
        ],
        [
            {
                user: "assistant",
                content: {
                    text: "Here are the top 5 lending opportunities by APR",
                    action: "LIST_EARNING_OPPORTUNITIES",
                    options: {
                        filter: "LEND",
                        sortBy: "apr",
                        limit: 5
                    }
                },
            },
            {
                user: "user",
                content: {
                    text: "What are the best lending options right now?",
                    action: "LIST_EARNING_OPPORTUNITIES",
                },
            },
        ],
    ],
    similes: ["SHOW_EARNING_OPPORTUNITIES", "FIND_STAKING_OPTIONS", "DISPLAY_APR_OPPORTUNITIES"],
};