export function paginationMeta(total, page, pageSize) {
  return {
    page,
    pageSize,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export function skipFor(page, pageSize) {
  return (page - 1) * pageSize;
}
