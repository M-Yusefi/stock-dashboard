import json

from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse

from .services.services import api_res
from .services.services import get_stock_data
from .services.services import get_market_index_data
from .analytics.stock_analyse import analyse


def index(request):
    return render(request, 'stocks/index.html')


def load_ticker_data():
    ticker_file = settings.BASE_DIR / "nasdaq_full_tickers.json"
    return [
        {
            "symbol": stock["symbol"],
            "name": stock["name"],
            "sector": stock["sector"],
            "country": stock["country"],
            "ipoyear": stock["ipoyear"],
            "industry": stock["industry"],
        }
        for stock in json.loads(ticker_file.read_text(encoding="utf-8"))
    ]


def ticker_suggestions(request):
    return JsonResponse({"tickers": load_ticker_data()})


def market_index(request):
    try:
        return JsonResponse(get_market_index_data("^GSPC"))
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=502)


def search_stock(request):
    ticker = request.GET.get("ticker")
    period = request.GET.get("period", "1mo")
    valid_periods = {
        "1d", "5d", "1mo", "2mo", "3mo", "6mo",
        "1y", "2y", "5y", "10y", "ytd", "max",
    }

    if period not in valid_periods:
        period = "1mo"

    stock_data = get_stock_data(ticker, period)
    analysis_results = analyse(stock_data["history"])
    response_data = {**stock_data, **analysis_results}

    return JsonResponse(response_data)