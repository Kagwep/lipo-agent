const volatilityResponse = await Functions.makeHttpRequest({
    url: "https://o9r0ju4pg2.execute-api.eu-north-1.amazonaws.com/dev/lipo_volatility_predict",
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    data: {
        action: "volatility"
    }
});

if (volatilityResponse.error) {
    throw Error("Volatility request failed");
}

const volatilityData = volatilityResponse.data;
console.log("Volatility check result:", volatilityData);

// Return volatility result
return Functions.encodeString(JSON.stringify(volatilityData));