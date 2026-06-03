export const DIMENSION_UNITS = {
  WEIGHT: ['g', 'kg'],
  VOLUME: ['mL', 'L'],
  COUNT: ['item'],
};

export const UNIT_LABELS = {
  g: 'Grams (g)',
  kg: 'Kilograms (kg)',
  mL: 'Milliliters (mL)',
  L: 'Liters (L)',
  item: 'Items (item)',
};

/**
 * Converts a quantity from one unit to another
 * @param {number} quantity 
 * @param {string} fromUnit 
 * @param {string} toUnit 
 * @returns {number}
 */
export function convertQuantity(quantity, fromUnit, toUnit) {
  const q = parseFloat(quantity);
  if (isNaN(q)) return 0;
  if (fromUnit === toUnit) return q;

  // Weight conversions
  if (fromUnit === 'kg' && toUnit === 'g') {
    return q * 1000;
  }
  if (fromUnit === 'g' && toUnit === 'kg') {
    return q / 1000;
  }

  // Volume conversions
  if (fromUnit === 'L' && toUnit === 'mL') {
    return q * 1000;
  }
  if (fromUnit === 'mL' && toUnit === 'L') {
    return q / 1000;
  }

  // Count conversions
  if (fromUnit === 'item' && toUnit === 'item') {
    return q;
  }

  throw new Error(`Incompatible units for conversion: from ${fromUnit} to ${toUnit}`);
}

/**
 * Calculates the price of a requested quantity.
 * @param {number} requestedQty - The quantity in requested unit
 * @param {string} requestedUnit - The unit of the requested quantity
 * @param {string} baseUnit - The base unit of the product
 * @param {number} basePrice - The price per base unit
 * @returns {number} The total calculated price
 */
export function calculatePrice(requestedQty, requestedUnit, baseUnit, basePrice) {
  const baseQuantity = convertQuantity(requestedQty, requestedUnit, baseUnit);
  return baseQuantity * parseFloat(basePrice);
}

/**
 * Formats a value as INR Currency
 * @param {number} value 
 * @returns {string}
 */
export function formatINR(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}
