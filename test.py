import requests

# Set your latitude and longitude values
lat = -1.2921   # Example: Nairobi
long = 36.8219

# Format the API URL
url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={long}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m"

# Make the GET request
response = requests.get(url)

# Print the JSON response

print(response.data)
