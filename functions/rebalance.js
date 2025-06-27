// Your API Gateway URL
const API_URL = "https://o9r0ju4pg2.execute-api.eu-north-1.amazonaws.com/dev/lipo_volatility_predict";


// Rebalance portfolio function
async function rebalancePosition() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'rebalance'
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error rebalancing position:', error);
        return null;
    }
}