exports.handler = async (event, context) => {
    /**
     * AWS Lambda function to send messages to Eliza API
     * 
     * Expected event parameters:
     * - action: 'volatility' or 'rebalance' (optional, defaults to 'rebalance')
     * - message: custom message (optional)
     */
    
    // Configuration from environment variables
    const BASE_URL = process.env.BASE_URL || 'https://lipo-agent-production.up.railway.app';
    const AGENT_ID = process.env.AGENT_ID || 'c405c2f3-c94b-007f-bf01-7686419b6055';
    
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    try {
        // Parse event body if it's a string (from API Gateway)
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
        
        // Parse event parameters from body
        const action = body.action || 'rebalance';
        const customMessage = body.message || '';
        
        // Determine message based on action and parameters
        let message;
        if (action === 'volatility') {
            message = customMessage || "What's the volatility of today?";
        } else { // default to rebalance action
            message = customMessage || "Rebalance position if threshold is below 1.5";
        }
        
        // Send message to Eliza API
        const response = await sendMessage(BASE_URL, AGENT_ID, message);
        
        if (response) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    code: 'SUCCESS',
                    action: action,
                    message: message
                })
            };
        } else {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    code: 'ERROR',
                    error: 'Failed to send message'
                })
            };
        }
        
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                code: 'ERROR',
                error: error.message
            })
        };
    }
};

async function sendMessage(baseUrl, agentId, message) {
    try {
        const url = `${baseUrl}/${agentId}/message`;
        
        const formData = new URLSearchParams();
        formData.append('text', message);
        formData.append('user', 'user');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}
