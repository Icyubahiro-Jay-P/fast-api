import re


def escape_regex(text: str) -> str:
    if not text:
        return ""
    return re.escape(text)


def search_regex(text: str):
    escaped = escape_regex(text.strip())
    return {"$regex": escaped, "$options": "i"}
