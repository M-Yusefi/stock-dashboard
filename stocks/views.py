import json

from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse

from .services.services import api_res
from .services.services import get_stock_data
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


def search_stock(request):
    ticker = request.GET.get("ticker")

    stock_data = get_stock_data(ticker)
    analysis_results = analyse(stock_data["history"])
    response_data = {**stock_data, **analysis_results}

    return JsonResponse(response_data)