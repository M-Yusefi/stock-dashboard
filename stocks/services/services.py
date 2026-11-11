import requests
import os
from dotenv import load_dotenv

def api_res(ticker):
    
    load_dotenv()
    api_key = os.getenv("FINANCIAL_DATA_API_KEY")

    if not api_key:
        raise ValueError("API-key ontbreekt")
   
    url = "https://financialdata.net/api/v1/stock-prices"

    params = {
        "identifier": ticker,
        "key": api_key
    }


    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    
    return response.json()

