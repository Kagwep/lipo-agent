export function formatOpportunitiesWithEmoji(opportunities, filterOptions = {}) {
    // Create the title
    let responseTitle = `🔍 Here are the${(filterOptions as any).filter  && (filterOptions as any).filter.toLowerCase() === 'lend' ? ' current lending' : ''} opportunities on Swellchain:`;
                 
    // Format each opportunity with emojis
    const formattedOpps = opportunities.map((opp, index) => {
      // Create lines for each opportunity
      let lines = [];
     
      // Main line with name and APR
      let mainLine = `💼 ${index + 1}. ${opp.name.toUpperCase()} - ${formatApr(opp.apr)} APR`;
      if (opp.protocol && opp.protocol.name) {
        mainLine += ` on ${opp.protocol.name}`;
      }
      lines.push(mainLine);
     
      // TVL and daily rewards
      let tvlLine = `   📊 TVL: ${opp.tvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      if (opp.dailyRewards > 0) {
        tvlLine += ` | 💰 Daily rewards: ${opp.dailyRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      }
      lines.push(tvlLine);
     
      // Tokens
      if (opp.tokens && opp.tokens.length > 0) {
        const tokensList = opp.tokens.map(token => token.symbol).join(', ');
        lines.push(`   🪙 Tokens: ${tokensList}`);
      }
     
      // Deposit URL - As plain text link
      if (opp.depositUrl) {
        lines.push(`   🔗 ${opp.depositUrl}`);
      }
     
      // Tags
      if (opp.tags && opp.tags.length > 0) {
        const tagsText = opp.tags.join(' | ');
        lines.push(`   🏷️ ${tagsText}`);
      }
     
      return lines.join('\n');
    }).join('\n\n');
   
    // Add the footer
    const footer = "ℹ️ These rates adjust based on market conditions. Want me to filter for specific types of opportunities?";
   
    // Combine all parts
    return `${responseTitle}\n\n${formattedOpps}\n\n${footer}`;
  }
  
  // Example formatting function for APR
  function formatApr(apr) {
    return `${apr.toFixed(1)}%`;
  }
  


  