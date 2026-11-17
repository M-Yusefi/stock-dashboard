from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='stocks'),
    path("ticker-suggestions/", views.ticker_suggestions, name="ticker_suggestions"),
    path("search-stock/", views.search_stock, name="search_stock"),
]