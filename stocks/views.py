from django.shortcuts import render
from django.http import JsonResponse
from .services import api_res


def index(request):
    return render(request, 'stocks/index.html')


def search_stock(request):
    ticker = request.GET.get("ticker")

    data = api_res(ticker)

    return JsonResponse(data, safe=False)