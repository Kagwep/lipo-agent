import numpy as np
import pandas as pd
import onnxruntime as ort
import requests
import time
import datetime
from typing import Dict, Tuple

class VolatilityPredictor:
    """
    Volatility predictor using crypto exchange data and ONNX model
    """
    
    def __init__(self, model_path: str = "crypto_vol_model.onnx"):
        """
        Initialize predictor with exchange API and ONNX model
        """
        self.model_path = model_path
        self.base_url = "https://api.binance.com/api/v3/klines"
        self.session = None
        self.input_name = None
        self.output_name = None
        self.current_pair = None
        self._load_model()
    
    def _load_model(self):
        """Load ONNX model"""
        try:
            self.session = ort.InferenceSession(self.model_path)
            self.input_name = self.session.get_inputs()[0].name
            self.output_name = self.session.get_outputs()[0].name
            print(f"Loaded ONNX model: {self.model_path}")
        except Exception as e:
            print(f"Failed to load model: {e}")
            raise
    
    def get_crypto_data(self, symbol: str, days: int = 30) -> pd.DataFrame:
        """
        Get recent data from exchange API
        """
        print(f"Fetching {symbol} from exchange (last {days} days)...")
        
        # Calculate time range
        end_time = int(time.time() * 1000)
        start_time = end_time - (days * 24 * 60 * 60 * 1000)
        
        params = {
            'symbol': symbol,
            'interval': '1d',
            'startTime': start_time,
            'endTime': end_time,
            'limit': 1000
        }
        
        try:
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data:
                raise ValueError(f"No data for {symbol}")
            
            # Convert to DataFrame
            df = pd.DataFrame(data, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            
            # Process data
            df['Date'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['Open'] = df['open'].astype(float)
            df['Close'] = df['close'].astype(float)
            
            df = df[['Date', 'Open', 'Close']].sort_values('Date')
            
            print(f"Got {len(df)} records for {symbol}")
            return df
            
        except Exception as e:
            print(f"Failed to get {symbol}: {e}")
            raise
    
    def get_crypto_pair_data(self, days: int = 30) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Get crypto pair data with fallback options
        """
        # Primary options (LINK/USDT)
        crypto_symbols = ["LINKUSDT", "UNIUSDT", "AAVEUSDT", "SUSHIUSDT", "1INCHUSDT"]
        eth_symbol = "ETHUSDT"
        
        crypto_data = None
        crypto_symbol = None
        
        # Try crypto symbols
        for symbol in crypto_symbols:
            try:
                crypto_data = self.get_crypto_data(symbol, days)
                crypto_symbol = symbol
                break
            except Exception as e:
                print(f"{symbol} failed: {e}")
                continue
        
        if crypto_data is None:
            raise ValueError("All crypto symbols failed!")
        
        # Get ETH data
        try:
            eth_data = self.get_crypto_data(eth_symbol, days)
        except Exception as e:
            print(f"ETH data failed: {e}")
            raise
        
        self.current_pair = f"{crypto_symbol}/ETHUSDT"
        print(f"Using pair: {self.current_pair}")
        
        return crypto_data, eth_data
    
    def prepare_features(self, crypto_data: pd.DataFrame, eth_data: pd.DataFrame) -> np.ndarray:
        """
        Prepare features for prediction
        """
        # Merge data
        crypto_clean = crypto_data[['Date', 'Open']].rename(columns={'Open': 'CRYPTO'})
        eth_clean = eth_data[['Date', 'Open']].rename(columns={'Open': 'ETH'})
        
        df = pd.merge(crypto_clean, eth_clean, on='Date')
        df = df.dropna().sort_values('Date')
        
        if len(df) < 15:
            raise ValueError(f"Insufficient data: {len(df)} points")
        
        # Calculate price ratio
        df['price'] = df['ETH'] / df['CRYPTO']
        
        # Calculate returns
        returns = 100 * df['price'].pct_change().dropna()
        
        if len(returns) < 10:
            raise ValueError("Insufficient returns data")
        
        # Calculate features (last 5 days)
        recent_returns = returns.tail(10)  # Get last 10 returns for rolling calc
        
        realized_vol = recent_returns.rolling(5).std().iloc[-1]
        returns_squared = recent_returns.iloc[-1] ** 2
        
        if pd.isna(realized_vol) or pd.isna(returns_squared):
            raise ValueError("NaN in features")
        
        features = np.array([[realized_vol, returns_squared]], dtype=np.float32)
        
        print(f"Features calculated:")
        print(f"   Realized Vol: {realized_vol:.6f}")
        print(f"   Returns²: {returns_squared:.6f}")
        
        return features
    
    def predict(self, features: np.ndarray) -> Dict:
        """
        Make volatility prediction
        """
        if self.session is None:
            raise ValueError("Model not loaded")
        
        try:
            # Predict
            prediction = self.session.run(
                [self.output_name], 
                {self.input_name: features}
            )[0]
            
            predicted_vol = float(prediction[0][0])
            
            # Calculate additional metrics
            annual_vol = predicted_vol * np.sqrt(252)
            vol_level = self._classify_volatility(predicted_vol)
            
            result = {
                'predicted_volatility_5d': predicted_vol,
                'annualized_volatility': annual_vol,
                'volatility_level': vol_level,
                'trading_pair': self.current_pair,
                'features': {
                    'realized_vol': float(features[0][0]),
                    'returns_squared': float(features[0][1])
                },
                'timestamp': datetime.datetime.now().isoformat(),
                'data_source': 'Exchange API'
            }
            
            return result
            
        except Exception as e:
            print(f"Prediction error: {e}")
            raise
    
    def _classify_volatility(self, vol: float) -> str:
        """Classify volatility level"""
        if vol < 2:
            return "LOW"
        elif vol < 5:
            return "MODERATE" 
        elif vol < 10:
            return "HIGH"
        else:
            return "EXTREME"
    
    def predict_live(self) -> Dict:
        """
        Get live prediction using latest exchange data
        """
        print("Starting live volatility prediction with exchange data...")
        
        try:
            # Get latest data
            crypto_data, eth_data = self.get_crypto_pair_data(days=30)
            
            # Prepare features
            features = self.prepare_features(crypto_data, eth_data)
            
            # Make prediction
            result = self.predict(features)
            
            # Display results
            self._display_results(result)
            
            return result
            
        except Exception as e:
            print(f"Live prediction failed: {e}")
            raise
    
    def _display_results(self, result: Dict):
        """Display results nicely"""
        print("\n" + "="*70)
        print("CRYPTO VOLATILITY PREDICTION")
        print("="*70)
        print(f"Trading Pair: {result['trading_pair']}")
        print(f"5-Day Volatility: {result['predicted_volatility_5d']:.4f}%")
        print(f"Annualized Volatility: {result['annualized_volatility']:.2f}%")
        print(f"Risk Level: {result['volatility_level']}")
        print(f"Data Source: {result['data_source']}")
        print(f"Prediction Time: {result['timestamp']}")
        
        print(f"\nInput Features:")
        print(f"   • Realized Volatility: {result['features']['realized_vol']:.6f}")
        print(f"   • Squared Returns: {result['features']['returns_squared']:.6f}")
        
        print(f"\nTrading Implications:")
        vol_level = result['volatility_level']
        if vol_level == "LOW":
            print("   Low volatility - Consider increasing position sizes")
            print("   Good time for mean reversion strategies")
        elif vol_level == "MODERATE":
            print("   Normal volatility - Standard risk management")
            print("   Balanced approach recommended")
        elif vol_level == "HIGH":
            print("   High volatility - Reduce position sizes")
            print("   Good for momentum strategies, tight stops")
        else:
            print("   Extreme volatility - Minimal exposure")
            print("   High risk of large drawdowns")
        
        print("="*70)

def test_crypto_prediction():
    """
    Test the exchange-based volatility predictor
    """
    try:
        predictor = VolatilityPredictor("crypto_vol_model.onnx")
        result = predictor.predict_live()
        return result
        
    except FileNotFoundError:
        print("Model file 'crypto_vol_model.onnx' not found!")
        print("Run the training script first to create the model")
        return None
    except Exception as e:
        print(f"Test failed: {e}")
        return None

if __name__ == "__main__":
    print("Crypto Volatility Predictor")
    print("="*50)
    
    result = test_crypto_prediction()
    
    if result:
        print(f"\nPrediction successful!")
        print(f"Expected volatility: {result['predicted_volatility_5d']:.4f}%")
        print(f"Risk level: {result['volatility_level']}")
    else:
        print("Prediction failed")