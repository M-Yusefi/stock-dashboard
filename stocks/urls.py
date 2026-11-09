from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='stocks'),
    path("search-stock/", views.search_stock, name="search_stock"),
]