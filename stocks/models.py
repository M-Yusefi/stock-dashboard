from django.db import models


class Stock(models.Model):
    ticker = models.CharField(max_length=20)
    company_name = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)