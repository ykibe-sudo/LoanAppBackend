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

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
      ref: data.reference,
        email: `${phone}@loanapp.com`, // fake email but unique
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

    // ✅ Send clean response to frontend
    res.json({
      status: true,
      url: response.data.data.authorization_url,
      reference: response.data.data.reference
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      status: false,
      message: 'Payment initialization failed'
    });
  }
});


/**
 * ===============================
 * 2. VERIFY PAYMENT (IMPORTANT)
 * ===============================
 */
app.get('/api/paystack/verify', async (req, res) => {
  const { reference } = req.query;

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

    if (data.status === 'success') {
      console.log('✅ Payment successful:', data);

      // 👉 You can store in DB here if needed

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
    console.error(error.response?.data || error.message);
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
