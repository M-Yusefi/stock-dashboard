from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='stocks'),
    path("market-index/", views.market_index, name="market_index"),
    path("ticker-suggestions/", views.ticker_suggestions, name="ticker_suggestions"),
    path("search-stock/", views.search_stock, name="search_stock"),
]