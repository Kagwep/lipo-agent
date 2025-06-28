
const rebalanceResponse = await Functions.makeHttpRequest({
    url: "https://o9r0ju4pg2.execute-api.eu-north-1.amazonaws.com/dev/lipo_volatility_predict",
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    data: {
        action: "rebalance"
    }
});

if (rebalanceResponse.error) {
    throw Error("Rebalance request failed");
}

const rebalanceData = rebalanceResponse.data;
console.log("Rebalance result:", rebalanceData);

// Return rebalance result
return Functions.encodeString(JSON.stringify(rebalanceData));