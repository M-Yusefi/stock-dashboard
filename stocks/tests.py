from django.test import TestCase
from .analytics.stock_analysis import last_trading_day


class LastTradingDayTests(TestCase):
    def test_calculates_percentage_change_when_open_price_is_nonzero(self):
        data = [{
            "date": "2026-11-17",
            "open": 100,
            "close": 110,
            "volume": 1000,
        }]
        historical = {"average_close_price": 105}

        result = last_trading_day(data, historical)

        self.assertEqual(result["lastday_percetage_changes"], 10)
