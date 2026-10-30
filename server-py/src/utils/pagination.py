def skip_for(page: int, page_size: int) -> int:
    return max(0, (page - 1) * page_size)
