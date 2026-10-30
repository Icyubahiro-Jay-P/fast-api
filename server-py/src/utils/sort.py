def parse_sort(sort: str | None, allowed_fields: set):
    if not sort:
        return [("createdAt", -1)]
    # sort can be like "name" or "-createdAt"
    if sort.startswith("-"):
        field = sort[1:]
        direction = -1
    else:
        field = sort
        direction = 1
    if field not in allowed_fields:
        return [("createdAt", -1)]
    return [(field, direction)]
