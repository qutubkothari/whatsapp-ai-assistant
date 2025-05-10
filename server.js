
const express = require("express");
const axios = require("axios");
require("dotenv").config();

const { getPricingRow, getCustomerType, logOrder } = require("./google");
const { getPriceForQuantity, applyDiscount, getDeliveryTime } = require("./helpers");

const app = express();
app.use(express.json());

// 🔁 Dynamic config per client phone_id
const clientConfigs = {
  "88335": {
    sheetId: "your_google_sheet_id_here",
    pricingSheet: "Product_Pricing",
    customerSheet: "Customer_Type",
    orderSheet: "Orders",
  }
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAYTAPI_API_KEY = process.env.MAYTAPI_API_KEY;

// 📬 Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    const type = req.body.type;
    const phoneId = String(req.body.phone_id);
    const userData = req.body.user;
    const messageData = req.body.message;

    console.log("📩 Incoming:", JSON.stringify(req.body, null, 2));

    // Ignore non-messages
    if (type !== "message") return res.sendStatus(200);

    const client = clientConfigs[phoneId];
    if (!client) return res.status(400).send("Unknown client phone_id");

    const userPhone = userData.phone;
    const userMessage = messageData.text;

    // Parse product name, size, and quantity from message like "NFF 8x80 - 100"
    const match = userMessage.match(/(.+?)\s+(\d+x\d+)\s*-\s*(\d+)/i);
    if (!match) {
      return sendMaytapiReply(userPhone, "Please send a message like: NFF 8x80 - 100 cartons");
    }

    const [_, productName, size, qtyStr] = match;
    const quantity = parseInt(qtyStr);

    // Get product pricing row
    const rowData = await getPricingRow(client.sheetId, client.pricingSheet, productName.trim(), size.trim());
    if (!rowData) return sendMaytapiReply(userPhone, "Product not found in price list.");

    const unitPrice = getPriceForQuantity(rowData.headers, rowData.values, quantity);
    if (!unitPrice) return sendMaytapiReply(userPhone, "No price available for that quantity.");

    // Get customer discount
    const customer = await getCustomerType(client.sheetId, client.customerSheet, userPhone);
    const finalPrice = applyDiscount(unitPrice, customer.discount);

    const total = (finalPrice * quantity).toFixed(2);
    const delivery = getDeliveryTime("advance", quantity); // hardcoded to "advance" now

    const reply = `✅ *Quote*\nProduct: ${productName} ${size}\nQty: ${quantity} cartons\nCustomer: ${customer.type}\nPrice/carton: ₹${finalPrice}\nTotal: ₹${total}\nDelivery: ${delivery}`;

    await sendMaytapiReply(userPhone, reply);

    // Log order
    await logOrder(client.sheetId, client.orderSheet, [
      new Date().toISOString(),
      userPhone,
      productName,
      size,
      quantity,
      unitPrice,
      customer.discount,
      finalPrice,
      total,
      "advance",
      delivery
    ]);

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).send("Server Error");
  }
});

// 📤 Maytapi Reply Sender
async function sendMaytapiReply(to_number, message) {
  const { MAYTAPI_PRODUCT_ID, MAYTAPI_PHONE_ID } = process.env;

  await axios.post(
    `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage`,
    {
      to_number,
      type: "text",
      message,
      token: MAYTAPI_API_KEY
    }
  );
}

// 🔁 Health check
app.get("/", (req, res) => {
  res.send("✅ WhatsApp AI Assistant is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
