import requests

# Your API Gateway URL
API_URL = "https://o9r0ju4pg2.execute-api.eu-north-1.amazonaws.com/dev/lipo_volatility_predict"

print("🚀 Testing Volatility Prediction API")
print("=" * 50)

# Test 1: Default volatility prediction (30 days)
print("\n1️⃣ Default volatility prediction (30 days):")
response = requests.post(API_URL, json={
    "days": 30
})
result = response.json()
print(f"Status: {response.status_code}")
print(f"Response: {result}")

if result.get('code') == 'SUCCESS':
    prediction = result.get('prediction', {})
    print(f"✅ Volatility Level: {result.get('volatility_level')}")
    print(f"📊 Full Prediction: {prediction}")

# Test 2: 7-day volatility prediction
print("\n2️⃣ Short-term volatility (7 days):")
response = requests.post(API_URL, json={
    "days": 7
})
result = response.json()
print(f"Status: {response.status_code}")
print(f"Response: {result}")

if result.get('code') == 'SUCCESS':
    print(f"✅ 7-day Volatility: {result.get('volatility_level')}")

# Test 3: Long-term volatility prediction
print("\n3️⃣ Long-term volatility (60 days):")
response = requests.post(API_URL, json={
    "days": 60
})
result = response.json()
print(f"Status: {response.status_code}")
print(f"Response: {result}")

if result.get('code') == 'SUCCESS':
    print(f"✅ 60-day Volatility: {result.get('volatility_level')}")

# Test 4: Error handling - invalid days
print("\n4️⃣ Error test (invalid input):")
response = requests.post(API_URL, json={
    "days": -5
})
result = response.json()
print(f"Status: {response.status_code}")
print(f"Response: {result}")

# Test 5: No parameters (should default to 30 days)
print("\n5️⃣ No parameters test:")
response = requests.post(API_URL, json={})
result = response.json()
print(f"Status: {response.status_code}")
print(f"Response: {result}")

if result.get('code') == 'SUCCESS':
    print(f"✅ Default Volatility: {result.get('volatility_level')}")
    print(f"📅 Days Analyzed: {result.get('days_analyzed')}")

print("\n" + "=" * 50)
print("🎯 Volatility Prediction Tests Complete!")

# Summary function
def get_volatility_summary():
    """Get a quick volatility summary across different timeframes"""
    print("\n📈 VOLATILITY SUMMARY:")
    print("-" * 30)
    
    timeframes = [7, 14, 30, 60]
    volatility_levels = []
    
    for days in timeframes:
        try:
            response = requests.post(API_URL, json={"days": days})
            result = response.json()
            
            if result.get('code') == 'SUCCESS':
                vol_level = result.get('volatility_level', 'UNKNOWN')
                volatility_levels.append(f"{days}d: {vol_level}")
            else:
                volatility_levels.append(f"{days}d: ERROR")
                
        except Exception as e:
            volatility_levels.append(f"{days}d: FAILED")
    
    for vol in volatility_levels:
        print(f"  📊 {vol}")
    
    return volatility_levels

# Run summary
get_volatility_summary()