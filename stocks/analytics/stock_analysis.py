def analyse(symbol):

    if not symbol:
        return {
            "error": "Error",
            "message": "This stock has no value to calculate"
        }

    absolute_price = []
    close_price = []
    percentage_changes = []
    volume = []

    for i in symbol:
        absolute_price.append(i['close'] - i['open'])

        if i['open'] != 0:
            percentage_changes.append(
                (i['close'] - i['open']) / i['open'] * 100
            )

        close_price.append(i['close'])
        volume.append(i['volume'])

    avg_close_price = round(sum(close_price) / len(close_price), 2)
    highest_close = round(max(close_price), 2)
    lowest_close = round(min(close_price), 2)

    avg_volume = round(sum(volume) / len(volume),2)
    highest_volume = round(max(volume), 2)
    lowest_volume = round(min(volume), 2)

    results = {
        "avg_close_price": avg_close_price,
        "highest_close": highest_close,
        "lowest_close": lowest_close,
        "avg_volume": avg_volume,
        "highest_volume": highest_volume,
        "lowest_volume": lowest_volume,
        "absolute_price": absolute_price,
        "percentage_changes": percentage_changes
    }

    return results