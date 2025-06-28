exports.handler = async (event, context) => {
    /**
     * AWS Lambda function for crypto volatility prediction
     * 
     * Expected event parameters:
     * - days: number of days for volatility prediction (optional, defaults to 30)
     */
    
    // Configuration from environment variables
    const PREDICTION_API_URL = process.env.PREDICTION_API_URL || 'http://13.51.85.232:8000/predict';
    
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    try {
        // Handle multiple input formats
        let body;
        
        if (event.body) {
            // API Gateway format (body as string or object)
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } else if (event.data) {
            // Chainlink Functions format (data object)
            body = event.data;
        } else {
            // Direct Lambda invocation format
            body = event;
        }
        
        // Parse parameters
        const days = body.days || 30;
        
        // Get volatility prediction
        const predictionResponse = await getVolatilityPrediction(days);
        
        if (predictionResponse && predictionResponse.success) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    code: 'SUCCESS',
                    prediction: predictionResponse.prediction,
                    volatility_level: predictionResponse.prediction.volatility_level,
                    days_analyzed: days
                })
            };
        } else {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    code: 'ERROR',
                    error: 'Failed to get volatility prediction'
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

async function getVolatilityPrediction(days = 30) {
    try {
        const response = await fetch(process.env.PREDICTION_API_URL || 'http://13.51.85.232:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                days: days
            })
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error('Prediction API returned error status:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Prediction API error:', error);
        return null;
    }
}