import datetime
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
import requests
import time
from typing import Optional, Tuple
from sklearn.metrics import mean_squared_error as mse

class CryptoDataLoader:
    """
    Download crypto data from exchange API - much more reliable than yfinance
    """
    
    def __init__(self):
        self.base_url = "https://api.binance.com/api/v3/klines"
        
    def get_crypto_data(self, symbol: str, interval: str = "1d", 
                        start_time: Optional[int] = None, 
                        end_time: Optional[int] = None, 
                        limit: int = 1000) -> pd.DataFrame:
        """
        Download data from exchange API
        
        Args:
            symbol: Trading pair (e.g., 'LINKUSDT', 'ETHUSDT')
            interval: Time interval ('1d', '1h', '4h', etc.)
            start_time: Start timestamp in milliseconds
            end_time: End timestamp in milliseconds  
            limit: Number of data points (max 1000)
        """
        
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time
            
        print(f"Downloading {symbol} from exchange...")
        
        try:
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            if not data:
                raise ValueError(f"No data returned for {symbol}")
            
            # Convert to DataFrame
            df = pd.DataFrame(data, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            
            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            
            # Convert price columns to float
            price_cols = ['open', 'high', 'low', 'close', 'volume']
            for col in price_cols:
                df[col] = df[col].astype(float)
            
            # Rename columns to match your format
            df = df.rename(columns={
                'timestamp': 'Date',
                'open': 'Open',
                'high': 'High', 
                'low': 'Low',
                'close': 'Close',
                'volume': 'Volume'
            })
            
            # Keep only necessary columns
            df = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
            
            print(f"Downloaded {len(df)} data points for {symbol}")
            return df
            
        except requests.exceptions.RequestException as e:
            print(f"Request error for {symbol}: {e}")
            raise
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
            raise
    
    def get_historical_data(self, symbol: str, days_back: int = 1000) -> pd.DataFrame:
        """
        Get historical data for specified number of days
        
        Args:
            symbol: Trading pair (e.g., 'LINKUSDT')
            days_back: Number of days to go back
        """
        
        # Calculate timestamps
        end_time = int(time.time() * 1000)  # Current time in milliseconds
        start_time = end_time - (days_back * 24 * 60 * 60 * 1000)  # days_back ago
        
        all_data = []
        current_start = start_time
        
        # API limits to 1000 records per request, so we might need multiple requests
        while current_start < end_time:
            current_end = min(current_start + (999 * 24 * 60 * 60 * 1000), end_time)
            
            try:
                batch_data = self.get_crypto_data(
                    symbol=symbol,
                    start_time=current_start,
                    end_time=current_end,
                    limit=1000
                )
                
                if len(batch_data) == 0:
                    break
                    
                all_data.append(batch_data)
                current_start = current_end + 1
                
                # Be nice to API
                time.sleep(0.1)
                
            except Exception as e:
                print(f"Failed to get batch starting at {current_start}: {e}")
                break
        
        if not all_data:
            raise ValueError(f"No data retrieved for {symbol}")
        
        # Combine all batches
        combined_df = pd.concat(all_data, ignore_index=True)
        
        # Remove duplicates and sort
        combined_df = combined_df.drop_duplicates(subset=['Date']).sort_values('Date')
        combined_df = combined_df.reset_index(drop=True)
        
        print(f"Total {len(combined_df)} records for {symbol}")
        return combined_df

def download_crypto_data():
    """
    Download LINK and ETH data from exchange
    """
    loader = CryptoDataLoader()
    
    # Download data
    print("Starting crypto data download...")
    
    try:
        # LINK/USDT data
        link = loader.get_historical_data("LINKUSDT", days_back=2000)
        link.to_csv("link_data.csv", index=False)
        print("Saved LINK data to link_data.csv")
        
    except Exception as e:
        print(f"Failed to download LINK data: {e}")
        print("Trying alternative symbols...")
        
        # Try alternative symbols if LINK fails
        alternatives = ["UNIUSDT", "AAVEUSDT", "SUSHIUSDT"]
        link = None
        
        for alt_symbol in alternatives:
            try:
                print(f"Trying {alt_symbol}...")
                link = loader.get_historical_data(alt_symbol, days_back=2000)
                link.to_csv(f"{alt_symbol.lower()}_data.csv", index=False)
                print(f"Saved {alt_symbol} data")
                break
            except Exception as alt_e:
                print(f"{alt_symbol} also failed: {alt_e}")
                continue
        
        if link is None:
            raise ValueError("All alternative symbols failed!")
    
    try:
        # ETH/USDT data
        eth = loader.get_historical_data("ETHUSDT", days_back=2000)
        eth.to_csv("eth_data.csv", index=False)
        print("Saved ETH data to eth_data.csv")
        
    except Exception as e:
        print(f"Failed to download ETH data: {e}")
        raise
    
    return link, eth

def process_crypto_data(link: pd.DataFrame, eth: pd.DataFrame):
    """
    Process crypto data - modified to handle USDT pairs better
    """
    print("Processing crypto data...")
    
    # For USDT pairs, we don't need the price filter since prices are in USDT
    # But we can filter for reasonable price ranges if needed
    
    link_clean = link[["Date", "Open"]].copy()
    eth_clean = eth[["Date", "Open"]].copy()
    
    link_clean.rename(columns={"Open": "LINK"}, inplace=True)
    eth_clean.rename(columns={"Open": "ETH"}, inplace=True)
    
    # Merge on date
    df = pd.merge(link_clean, eth_clean, on="Date")
    df.dropna(inplace=True)
    
    print(f"Merged data: {len(df)} data points")
    
    if len(df) < 100:
        raise ValueError(f"Insufficient data after merge: {len(df)} points")
    
    # Calculate price ratio
    df["price"] = df["ETH"] / df["LINK"]
    
    # Calculate returns (same as original)
    ret = 100 * (df["price"].pct_change()[1:])
    
    # Calculate realized volatility 
    realized_vol = ret.rolling(5).std()
    realized_vol = pd.DataFrame(realized_vol)
    realized_vol.reset_index(drop=True, inplace=True)
    
    # Calculate squared returns
    returns_svm = ret**2
    returns_svm = returns_svm.reset_index()
    
    # Combine features
    X = pd.concat([realized_vol, returns_svm], axis=1, ignore_index=True)
    X = X[4:].copy()
    X = X.reset_index()
    X.drop("index", axis=1, inplace=True)
    X.drop(1, axis=1, inplace=True)
    X.rename(columns={0: "realized_vol", 2: "returns_squared"}, inplace=True)
    
    # Create target (predict volatility 5 days ahead)
    X["target"] = X["realized_vol"].shift(-5)
    X.dropna(inplace=True)
    
    print(f"Final feature matrix: {X.shape}")
    
    # Prepare target
    Y = X["target"]
    X.drop("target", axis=1, inplace=True)
    
    # Train/test split (last 252 days for testing)
    n = min(252, len(X) // 4)  # Use 1/4 for testing or 252 days, whichever is smaller
    
    X_train = X.iloc[:-n]
    X_test = X.iloc[-n:]
    Y_train = Y.iloc[:-n]
    Y_test = Y.iloc[-n:]
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    return X_train, X_test, Y_train, Y_test

def train_volatility_model(
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    Y_train: pd.DataFrame,
    Y_test: pd.DataFrame,
):
    """
    Train PyTorch model
    """
    # Use same architecture as original
    model = nn.Sequential(
        nn.Linear(X_train.shape[1], 128),
        nn.ReLU(),
        nn.Linear(128, 64),
        nn.ReLU(),
        nn.Linear(64, 1),
    )
    
    # Same loss and optimizer as original
    criterion = nn.MSELoss()
    optimizer = optim.RMSprop(model.parameters())
    
    # Convert data to PyTorch tensors
    X_tensor = torch.tensor(X_train.values, dtype=torch.float32)
    y_tensor = torch.tensor(Y_train.values.reshape(-1, 1), dtype=torch.float32)
    X_test_tensor = torch.tensor(X_test.values, dtype=torch.float32)
    
    # Training loop
    epochs_trial = np.arange(100, 400, 4)
    batch_trial = np.arange(100, 400, 4)
    DL_pred = []
    DL_RMSE = []
    
    for i, j, k in zip(range(4), epochs_trial, batch_trial):
        for epoch in range(j):
            optimizer.zero_grad()
            outputs = model(X_tensor)
            loss = criterion(outputs, y_tensor)
            loss.backward()
            optimizer.step()
        
        with torch.no_grad():
            DL_predict = model(X_test_tensor).numpy()
            DL_RMSE.append(
                np.sqrt(mse(Y_test.values / 100, DL_predict.flatten() / 100))
            )
            DL_pred.append(DL_predict)
            print("DL_RMSE_{}:{:.6f}".format(i + 1, DL_RMSE[i]))
    
    return model

def save_model_to_onnx(
    model: nn.Module, X_train: pd.DataFrame, save_path="crypto_vol_model"
):
    """
    Save model to ONNX format
    """
    # Ensure the model is in evaluation mode
    model.eval()
    
    # Dummy input matching the input size
    sample_input = torch.randn(
        1, X_train.shape[1]
    )  # Replace 1 with the batch size you'd like to use
    
    # Specify the path to save the ONNX model
    onnx_file_path = save_path + ".onnx"
    
    torch.onnx.export(
        model,
        sample_input,
        onnx_file_path,
        export_params=True,
        opset_version=10,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "output": {0: "batch_size"},
        },
    )
    
    print(f"Saved serialized ONNX model to {onnx_file_path}.")

def main():
    """
    Main function for crypto volatility model training
    """
    print("Starting crypto volatility model training...")
    print("="*60)
    
    try:
        # Download data from exchange
        link, eth = download_crypto_data()
        
        # Process data
        X_train, X_test, Y_train, Y_test = process_crypto_data(link, eth)
        
        # Train model
        model = train_volatility_model(X_train, X_test, Y_train, Y_test)
        
        # Save model
        save_model_to_onnx(model, X_train, "crypto_vol_model")
        
        print("\nTraining completed successfully!")
        print("Files created:")
        print("   • link_data.csv (or alternative crypto)")
        print("   • eth_data.csv") 
        print("   • crypto_vol_model.onnx")
        
        return model, X_train, X_test, Y_train, Y_test
        
    except Exception as e:
        print(f"Training failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    main()