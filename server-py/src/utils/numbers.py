def round_money(value: float) -> float:
    if value is None:
        return 0.0
    # Round to 2 decimal places
    return round(float(value) + 1e-12, 2)
