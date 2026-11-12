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

    for i in data:
        daily_absolute_changes.append(i['close'] - i['open'])

        if i['open'] != 0:
            daily_percentage_changes.append(
                (i['close'] - i['open']) / i['open'] * 100
            )

        closing_prices.append(i['close'])
        trading_volumes.append(i['volume'])


    highest_close_price = max(closing_prices)
    lowest_close_price = min(closing_prices)
    average_close_price = sum(closing_prices) / len(closing_prices)

    highest_close_date = ''
    lowest_close_date = ''

    for i in data:
        if i['close'] == highest_close_price:
            highest_close_date = i['date']

        if i['close'] == lowest_close_price:
            lowest_close_date = i['date']


    average_volume = sum(trading_volumes) / len(trading_volumes)
    highest_volume = max(trading_volumes)
    lowest_volume = min(trading_volumes)

    historical_results = {
        "average_close_price": round(average_close_price, 2),
        "highest_close_price": round(highest_close_price, 2),
        "lowest_close_price": round(lowest_close_price, 2),
        "highest_close_date": highest_close_date,
        "lowest_close_date": lowest_close_date,

        "average_volume": round(average_volume),
        "highest_volume": round(highest_volume),
        "lowest_volume": round(lowest_volume),

        "daily_absolute_changes": daily_absolute_changes,
        "daily_percentage_changes": daily_percentage_changes
    }

    return historical_results



def last_trading_day(data, historical):
    
    latest_data = data[0]

    trading_date = latest_data['date']
    open_price = latest_data['open']
    close_price = round(latest_data['close'], 2) 
    volume = latest_data['volume']
    average_daily_price = (open_price + close_price) / 2

    historical_average_price = historical['average_close_price']
    below_historical_average = close_price < historical_average_price
    price_difrance = close_price - historical_average_price

    last_day_results = {
        "trading_date": trading_date,
        "open_price": open_price,
        "close_price": close_price,
        "volume": volume, 
        "average_daily_price": round(average_daily_price, 2),
        "below_historical_average": below_historical_average,
        "price_difrance": round(price_difrance, 2) 
    }

    return last_day_results
    

