import json

from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse
from .services.services import api_res
from .analytics.stock_analysis import analyse


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
        }
        for stock in json.loads(ticker_file.read_text(encoding="utf-8"))
    ]


def ticker_suggestions(request):
    return JsonResponse({"tickers": load_ticker_data()})


def search_stock(request):
    ticker = request.GET.get("ticker")

    api_response = api_res(ticker)
    analyse_results = analyse(api_response)
    extra_info = next(
        (stock for stock in load_ticker_data() if stock["symbol"] == ticker.upper()),
        None,
    )
    analyse_results["extra_info"] = extra_info

    return JsonResponse(analyse_results)