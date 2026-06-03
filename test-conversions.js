import { convertQuantity, calculatePrice, formatINR } from './src/lib/unitConversion.js';

console.log("=== B2B Platform Calculation Verification ===");

try {
  // Test 1: Weight conversion (2 kg -> g)
  const q1 = convertQuantity(2, 'kg', 'g');
  console.log(`Test 1: 2 kg -> ${q1} g (Expected: 2000)`);
  if (q1 !== 2000) throw new Error("Test 1 Failed");

  // Test 2: Weight conversion (2500 g -> kg)
  const q2 = convertQuantity(2500, 'g', 'kg');
  console.log(`Test 2: 2500 g -> ${q2} kg (Expected: 2.5)`);
  if (q2 !== 2.5) throw new Error("Test 2 Failed");

  // Test 3: Volume conversion (3 L -> mL)
  const q3 = convertQuantity(3, 'L', 'mL');
  console.log(`Test 3: 3 L -> ${q3} mL (Expected: 3000)`);
  if (q3 !== 3000) throw new Error("Test 3 Failed");

  // Test 4: Pricing (2 kg Sugar at ₹0.06/g)
  const price = calculatePrice(2, 'kg', 'g', 0.06);
  console.log(`Test 4: Price of 2 kg Sugar @ ₹0.06/g = ₹${price} (Expected: 120)`);
  if (price !== 120) throw new Error("Test 4 Failed");

  // Test 5: Currency Formatting
  const formatted = formatINR(price);
  console.log(`Test 5: Formatted Price = ${formatted} (Expected: ₹120.00)`);

  console.log("\n[SUCCESS] All calculation verification tests passed successfully!");
} catch (err) {
  console.error("\n[FAILURE] A test failed:", err.message);
  process.exit(1);
}
