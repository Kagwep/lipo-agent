import requests

# Your API Gateway URL
API_URL = "https://o9r0ju4pg2.execute-api.eu-north-1.amazonaws.com/dev/lipo_volatility_predict"

# Check volatility
response = requests.post(API_URL, json={
    "action": "volatility"
})
print(response.json())

# # Rebalance portfolio
# response = requests.post(API_URL, json={
#     "action": "rebalance"
# })
# print(response.json())

# Custom message
response = requests.post(API_URL, json={
    "action": "volatility",
    "message": "What's the vol tady today?"
})
print(response.json())