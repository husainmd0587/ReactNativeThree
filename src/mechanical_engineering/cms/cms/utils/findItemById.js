export function findItemByPath(data, path) {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findItemByPath(item, path);
      if (found) return found;
    }
    return null;
  }

  // Only return real pages
  if (
    data.path === path &&
    Array.isArray(data.blocks)
  ) {
    return data;
  }

  if (data.blocks) {
    const found = findItemByPath(data.blocks, path);
    if (found) return found;
  }

  if (data.items) {
    const found = findItemByPath(data.items, path);
    if (found) return found;
  }

  return null;
}