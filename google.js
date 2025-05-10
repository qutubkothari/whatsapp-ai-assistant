
const { google } = require("googleapis");
const { JWT } = require("google-auth-library");

// 🔐 Load service account from environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// 📗 Create Google Sheets client
const auth = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

/**
 * 🔍 Fetch pricing row for given product + size
 */
async function getPricingRow(sheetId, sheetName, productName, size) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}`,
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) return null;

  const headers = rows[0];
  const nameIndex = headers.indexOf("product_name");
  const sizeIndex = headers.indexOf("size");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][nameIndex] === productName && rows[i][sizeIndex] === size) {
      return { headers, values: rows[i] };
    }
  }
  return null;
}

/**
 * 🔍 Get customer type and discount
 */
async function getCustomerType(sheetId, sheetName, phone) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}`,
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) return null;

  const headers = rows[0];
  const phoneIndex = headers.indexOf("phone");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][phoneIndex] === phone) {
      return {
        type: rows[i][headers.indexOf("type")],
        discount: parseFloat(rows[i][headers.indexOf("discount")] || 0),
      };
    }
  }

  return { type: "New", discount: 0 };
}

/**
 * 📝 Append new order or lead
 */
async function logOrder(sheetId, sheetName, orderData) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [orderData],
    },
  });
}

module.exports = {
  getPricingRow,
  getCustomerType,
  logOrder,
};
