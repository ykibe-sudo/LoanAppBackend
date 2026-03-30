require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

/**
 * ===============================
 * 1. INITIALIZE PAYMENT
 * ===============================
 */
app.post('/api/paystack/pay', async (req, res) => {
  const { amount, phone } = req.body;

  // 🔍 DEBUG (VERY IMPORTANT)
  console.log("REQUEST BODY:", req.body);

  // ❌ Validate input (prevents silent crashes)
  if (!amount || !phone) {
    return res.status(400).json({
      status: false,
      message: "Amount and phone are required"
    });
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: amount * 100, // convert to kobo
        email: `${phone}@loanapp.com`,
        callback_url: `${process.env.BASE_URL}/api/paystack/verify`,
        metadata: {
          phone: phone
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 🔍 DEBUG RESPONSE
    console.log("PAYSTACK RESPONSE:", response.data);

    // ✅ Clean response to frontend
    res.json({
      status: true,
      reference: response.data.data.reference,
      url: response.data.data.authorization_url
    });

  } catch (error) {
    // 🔥 SHOW REAL ERROR (THIS IS WHAT YOU NEED)
    console.error("PAYSTACK ERROR:", error.response?.data || error.message);

    res.status(500).json({
      status: false,
      message: error.response?.data?.message || 'Payment initialization failed'
    });
  }
});


/**
 * ===============================
 * 2. VERIFY PAYMENT
 * ===============================
 */
app.get('/api/paystack/verify', async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    return res.send('<h2>Missing reference</h2>');
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    console.log("VERIFY RESPONSE:", data);

    if (data.status === 'success') {
      return res.send(`
        <h2>Payment Successful ✅</h2>
        <p>Amount: ${data.amount / 100}</p>
        <p>Reference: ${data.reference}</p>
      `);
    } else {
      return res.send(`
        <h2>Payment Failed ❌</h2>
      `);
    }

  } catch (error) {
    console.error("VERIFY ERROR:", error.response?.data || error.message);
    res.send('<h2>Error verifying payment</h2>');
  }
});


/**
 * ===============================
 * SERVER START
 * ===============================
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});