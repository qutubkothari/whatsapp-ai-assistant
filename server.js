const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ Environment Variables (Ensure Render has these set)
const MAYTAPI_PRODUCT_ID = process.env.MAYTAPI_PRODUCT_ID;
const MAYTAPI_PHONE_ID = process.env.MAYTAPI_PHONE_ID;
const MAYTAPI_API_KEY = process.env.MAYTAPI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

const MAYTAPI_URL = `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage`;

// ✅ Health Check Route (Prevents 404 errors)
app.get("/", (req, res) => {
    res.send("🚀 WhatsApp AI Assistant is running on Render!");
});

// ✅ Webhook Route for Incoming WhatsApp Messages
app.post("/webhook", async (req, res) => {
    try {
        console.log("🔹 Raw Webhook Data:", JSON.stringify(req.body, null, 2));

        if (!req.body.message?.text || !req.body.user?.phone) {
            console.warn("ℹ️ Ignored non-message webhook or missing fields.");
            return res.sendStatus(200);
        }

        const body = req.body.message.text;
        const from = req.body.user.phone;

        console.log(`📩 Message from ${from}: ${body}`);

        // ✅ Generate AI Reply Using OpenAI (ChatGPT)
        const aiResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [{ role: "user", content: body }],
                max_tokens: 100,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const replyMessage = aiResponse.data.choices[0].message.content;
        console.log(`🤖 GPT Reply: ${replyMessage}`);

        // ✅ Send Reply via Maytapi API (Fixed request format)
        const sendMessageResponse = await axios.post(
            MAYTAPI_URL,
            {
                token: MAYTAPI_API_KEY,
                to_number: from,
                body: {
                    type: "text",
                    text: replyMessage,
                },
            }
        );

        console.log("✅ Message sent via Maytapi:", sendMessageResponse.data);
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Internal Server Error:", error.response?.data || error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ✅ Start Webhook Server (Ensure PORT is correct for Render)
app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
});