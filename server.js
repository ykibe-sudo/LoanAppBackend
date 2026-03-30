require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// ---------------------------
// 1️⃣ INITIALIZE PAYMENT
// ---------------------------
app.post('/api/paystack/pay', async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({
      status: false,
      message: 'Phone and amount are required'
    });
  }

  try {
    // Initialize transaction
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: `${phone}@loanapp.com`, // dummy email as required by Paystack
        amount: amount * 100, // Paystack expects amount in kobo
        callback_url: `${process.env.BASE_URL}/api/paystack/verify`,
        metadata: { phone }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      status: true,
      data: response.data.data // contains reference & authorization_url
    });

  } catch (err) {
    console.error('PAYSTACK INIT ERROR:', err.response?.data || err.message);
    res.status(500).json({
      status: false,
      message: err.response?.data?.message || 'Payment initialization failed'
    });
  }
});

// ---------------------------
// 2️⃣ VERIFY PAYMENT
// ---------------------------
app.get('/api/paystack/verify', async (req, res) => {
  const { reference } = req.query;

  if (!reference) return res.send('<h2>Missing payment reference</h2>');

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      }
    );

    const data = response.data.data;

    if (data.status === 'success') {
      return res.send(`
        <h2>Payment Successful ✅</h2>
        <p>Amount Paid: Ksh ${data.amount / 100}</p>
        <p>Reference: ${data.reference}</p>
        <p>Phone: ${data.metadata.phone}</p>
      `);
    } else {
      return res.send(`<h2>Payment Failed ❌</h2>`);
    }

  } catch (err) {
    console.error('PAYSTACK VERIFY ERROR:', err.response?.data || err.message);
    res.send('<h2>Error verifying payment</h2>');
  }
});

// ---------------------------
// 3️⃣ START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`BASE_URL is set to: ${process.env.BASE_URL}`);
});