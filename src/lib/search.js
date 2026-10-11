/**
 * Menu search helper supporting search by:
 * 1. Product / Dish Name (e.g. "Blue Bird", "Virgin Mojito", "Margherita")
 * 2. Category Name & Subtitles (e.g. "Mocktails", "Juices", "Pizzas", "Indian Kitchen", "Thin Crust")
 * 3. Price / Price Range / Variant Prices (e.g. "270", "₹270", "1070", "350")
 * 4. Multi-word and combination search (e.g. "Chicken 330", "Pizza 440", "Mocktail 270", "Pad Thai 350")
 * 5. Singular and plural variations (e.g. "pizza" / "pizzas", "curry" / "curries", "smoothie" / "smoothies")
 */

export const normalizeSearchText = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s₹]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const extractNumericDigits = (val) => String(val || '').replace(/\D/g, '');

export const getWordVariations = (word) => {
  const variations = [word];
  if (word.endsWith('ies') && word.length > 3) {
    variations.push(word.slice(0, -3) + 'y');
  }
  if (word.endsWith('es') && word.length > 3) {
    variations.push(word.slice(0, -2));
  }
  if (word.endsWith('s') && word.length > 2) {
    variations.push(word.slice(0, -1));
  }
  if (word.endsWith('y')) {
    variations.push(word.slice(0, -1) + 'ies');
  }
  return variations;
};

/**
 * Filter menu items based on a search query
 * @param {Array} items - List of menu items
 * @param {Array|Map} categories - List or Map of categories
 * @param {string} searchQuery - Search query string
 * @returns {Array} Filtered list of menu items
 */
export function filterMenuItems(items, categories, searchQuery) {
  if (!items || !Array.isArray(items)) return [];
  if (!searchQuery || !searchQuery.trim()) return items;

  const categoryMap =
    categories instanceof Map
      ? categories
      : new Map((categories || []).map((c) => [c.id, c]));

  const rawQuery = searchQuery.trim().toLowerCase();
  const normalizedRawQuery = normalizeSearchText(rawQuery);
  const queryTokens = rawQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return items.filter((item) => {
    const catObj = categoryMap.get(item.categoryId);
    const catName = normalizeSearchText(item.categoryName || catObj?.name || '');
    const catSubtitle = normalizeSearchText(catObj?.subtitle || '');
    const catId = normalizeSearchText((item.categoryId || '').replace(/[-_]/g, ' '));
    const itemName = normalizeSearchText(item.name || '');
    const itemDesc = normalizeSearchText(item.description || '');
    const itemPrice = normalizeSearchText(item.price || '');
    const itemPriceDigits = extractNumericDigits(item.price);

    const variantNames = Array.isArray(item.variants)
      ? item.variants.map((v) => normalizeSearchText(v.name)).join(' ')
      : '';
    const variantPrices = Array.isArray(item.variants)
      ? item.variants.map((v) => normalizeSearchText(v.price)).join(' ')
      : '';
    const variantPricesDigits = Array.isArray(item.variants)
      ? item.variants.map((v) => extractNumericDigits(v.price)).filter(Boolean)
      : [];

    const allPricesDigits = [itemPriceDigits, ...variantPricesDigits].filter(Boolean);

    const fullSearchableText = `${itemName} ${itemDesc} ${catName} ${catSubtitle} ${catId} ${itemPrice} ${variantNames} ${variantPrices}`;

    // 1. Direct full substring match
    if (fullSearchableText.includes(normalizedRawQuery)) {
      return true;
    }

    // 2. Direct pure price match (e.g. "270", "₹270", "270/-", "1070")
    const rawQueryDigits = extractNumericDigits(rawQuery);
    if (rawQueryDigits && allPricesDigits.some((d) => d === rawQueryDigits || d.includes(rawQueryDigits))) {
      const nonDigitPart = rawQuery.replace(/[\d₹,.\s/-]/g, '').trim();
      if (!nonDigitPart || nonDigitPart === 'rs' || nonDigitPart === 'inr' || nonDigitPart === 'in') {
        return true;
      }
    }

    // 3. Multi-token match (all tokens must match somewhere in name, category, desc, price, or variants)
    return queryTokens.every((token) => {
      const normalizedToken = normalizeSearchText(token);
      const tokenDigits = extractNumericDigits(token);

      // Numeric token matches item price or variant prices
      if (tokenDigits && allPricesDigits.some((d) => d === tokenDigits || d.includes(tokenDigits))) {
        const nonDigit = token.replace(/[\d₹,.\s/-]/g, '').trim();
        if (!nonDigit || nonDigit === 'rs' || nonDigit === 'inr') {
          return true;
        }
      }

      // Token word or singular/plural variation matches
      const tokenVariants = getWordVariations(normalizedToken);
      if (tokenVariants.some((tv) => fullSearchableText.includes(tv))) {
        return true;
      }

      return false;
    });
  });
}
