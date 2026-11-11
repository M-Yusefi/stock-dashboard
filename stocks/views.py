from django.shortcuts import render
from django.http import JsonResponse
from .services.services import api_res
from .analytics.stock_analysis import analyse

def index(request):
    return render(request, 'stocks/index.html')


def search_stock(request):
    ticker = request.GET.get("ticker")

    api_response = api_res(ticker)
    analyse_results = analyse(api_response)

    return JsonResponse(analyse_results, safe=False)