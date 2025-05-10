
/**
 * 🧮 Select price based on quantity slab
 * @param {*} headers - Sheet column headers (e.g., ["product_name", "size", "1-10", "11-50", ...])
 * @param {*} row - The row containing prices for each slab
 * @param {*} quantity - Number of cartons requested
 */
function getPriceForQuantity(headers, row, quantity) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header.includes("-")) {
      const [min, max] = header.split("-").map(Number);
      if (quantity >= min && quantity <= max) {
        return parseFloat(row[i]);
      }
    } else if (header.includes("+")) {
      const min = parseInt(header.replace("+", ""));
      if (quantity >= min) {
        return parseFloat(row[i]);
      }
    }
  }
  return null;
}

/**
 * 🧾 Calculate discounted price
 */
function applyDiscount(originalPrice, discountPercent) {
  return parseFloat((originalPrice * (1 - discountPercent / 100)).toFixed(2));
}

/**
 * 🚚 Calculate delivery time based on payment and quantity
 */
function getDeliveryTime(paymentType, quantity) {
  if (paymentType === "advance") {
    if (quantity < 50) return "Same-day delivery";
    else return "Delivery in 2 days";
  } else if (paymentType === "cod" || paymentType === "cash on delivery") {
    if (quantity < 50) return "Delivery in 3 days";
    else return "Delivery in 7 days";
  } else {
    return "Unknown payment method";
  }
}

module.exports = {
  getPriceForQuantity,
  applyDiscount,
  getDeliveryTime,
};
