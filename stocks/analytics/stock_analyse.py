
def analyse(data):

    if not data:
        return {
            "error": "Error",
            "message": "This stock has no value to calculate"
        }

    historical = historical_analysis(data)
    last_day = last_trading_day(data, historical)

    return {
        "historical_analysis": historical,
        "last_trading_day": last_day
    }


def historical_analysis(data):

    daily_absolute_changes = []
    daily_percentage_changes = []
    closing_prices = []
    trading_volumes = []
    trading_dates = []
    daily_ranges = []

    for item in data:

        open_price = item['open']
        close_price = item['close']
        high_price = item['high']
        low_price = item['low']

        daily_absolute_changes.append(close_price - open_price)

        if open_price != 0:
            daily_percentage_changes.append(
                (close_price - open_price) / open_price * 100
            )
        else:
            daily_percentage_changes.append(0)

        closing_prices.append(close_price)
        trading_volumes.append(item['volume'])
        trading_dates.append(item['date'])

        daily_ranges.append(high_price - low_price)

    # Closing price statistics
    highest_close_price = max(closing_prices)
    lowest_close_price = min(closing_prices)
    average_close_price = sum(closing_prices) / len(closing_prices)

    # Intraday price statistics
    highest_price = max(item['high'] for item in data)
    lowest_price = min(item['low'] for item in data)

    average_daily_range = sum(daily_ranges) / len(daily_ranges)

    # Dates of highest and lowest closing prices
    highest_close_date = ''
    lowest_close_date = ''

    for item in data:
        if item['close'] == highest_close_price:
            highest_close_date = item['date']

        if item['close'] == lowest_close_price:
            lowest_close_date = item['date']

    # Volume statistics
    average_volume = sum(trading_volumes) / len(trading_volumes)
    highest_volume = max(trading_volumes)
    lowest_volume = min(trading_volumes)

    historical_results = {
        "average_close_price": round(average_close_price, 2),
        "highest_close_price": round(highest_close_price, 2),
        "lowest_close_price": round(lowest_close_price, 2),

        "highest_close_date": highest_close_date,
        "lowest_close_date": lowest_close_date,

        "highest_price": round(highest_price, 2),
        "lowest_price": round(lowest_price, 2),
        "average_daily_range": round(average_daily_range, 2),

        "trading_dates": trading_dates,
        "closing_prices": closing_prices,

        "average_volume": round(average_volume),
        "highest_volume": highest_volume,
        "lowest_volume": lowest_volume,

        "daily_absolute_changes": daily_absolute_changes,
        "daily_percentage_changes": daily_percentage_changes
    }

    return historical_results


def last_trading_day(data, historical):

    latest_data = data[-1]

    trading_date = latest_data['date']
    open_price = latest_data['open']
    close_price = round(latest_data['close'], 2)
    volume = latest_data['volume']

    average_daily_price = (open_price + close_price) / 2

    historical_average_price = historical['average_close_price']

    below_historical_average = close_price < historical_average_price
    price_difference = close_price - historical_average_price

    last_day_results = {
        "trading_date": trading_date,
        "open_price": open_price,
        "close_price": close_price,
        "volume": volume,

        "average_daily_price": round(average_daily_price, 2),

        "below_historical_average": below_historical_average,
        "price_difference": round(price_difference, 2)
    }

    return last_day_results
