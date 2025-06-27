// Your API Gateway URL
const API_URL = "https://o9r0ju4pg2.execute-api.eu-north-1.amazonaws.com/dev/lipo_volatility_predict";

// Check volatility function
async function checkVolatility() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'volatility'
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error checking volatility:', error);
        return null;
    }
}