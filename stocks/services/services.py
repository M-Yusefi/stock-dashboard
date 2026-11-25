import requests
import os
import yfinance as yf

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


def get_stock_data(ticker, period="1mo"):
    # 1. Maak een ticker-object aan
    stock = yf.Ticker(ticker.upper())

    # 2. Haal alleen de datasets op die nodig zijn voor de overview
    info = stock.info
    history = stock.history(
        period=period,
        auto_adjust=False
    )
    raw_news = stock.news

    # 3. Selecteer de bedrijfsinformatie
    company_info = {
        "symbol": info.get("symbol"),
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "description": info.get("longBusinessSummary"),
        "currency": info.get("currency"),
        "website": info.get("website"),
        "employees": info.get("fullTimeEmployees"),
    }

    # 4. Selecteer de koersinformatie
    quote = {
        "price": info.get("regularMarketPrice") or info.get("currentPrice"),
        "pre_market_price": info.get("preMarketPrice"),
        "previous_close": info.get("regularMarketPreviousClose") or info.get("previousClose"),
        "change": info.get("regularMarketChange"),
        "change_percent": round(info.get("regularMarketChangePercent"), 2),
        "market_state": info.get("marketState"),
        "market_cap": info.get("marketCap"),
        "volume": info.get("regularMarketVolume") or info.get("volume"),
        "average_volume": info.get("averageVolume"),
        "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
    }

    # 5. Selecteer historische koersgegevens
    if not history.empty:
        history = history.reset_index()

        history["Date"] = history["Date"].dt.strftime("%Y-%m-%d")

        history = history.rename(columns={
            "Date": "date",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Adj Close": "adjusted_close",
            "Volume": "volume",
            "Dividends": "dividends",
            "Stock Splits": "stock_splits"
        })
        
        history = history.to_dict(orient="records")
    else:
        history = []

    # 6. Selecteer relevante nieuwsgegevens
    news = []

    for item in raw_news:
        content = item.get("content", item)

        # Controleer of het nieuws over de gevraagde ticker gaat
        finance = content.get("finance", {})
        stock_tickers = finance.get("stockTickers", [])

        mentioned_tickers = [
            stock_item.get("symbol")
            for stock_item in stock_tickers
        ]

        if ticker.upper() not in mentioned_tickers:
            continue

        thumbnail = content.get("thumbnail") or {}
        provider = content.get("provider") or {}
        article_url = (
            content.get("clickThroughUrl")
            or content.get("canonicalUrl")
            or {}
        )

        news.append({
            "title": content.get("title"),
            "summary": content.get("summary"),
            "published_at": content.get("pubDate"),
            "url": article_url.get("url"),
            "provider": provider.get("displayName"),
            "thumbnail": thumbnail.get("originalUrl"),
            "tickers": mentioned_tickers,
        })

    # 7. Geef alle geselecteerde gegevens terug
    return {
        "company": company_info,
        "quote": quote,
        "history": history,
        "news": news,
    }

