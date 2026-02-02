const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const CASHFREE_CLIENT_ID = "LIVE_CLIENT_ID_HERE";
const CASHFREE_CLIENT_SECRET = "LIVE_CLIENT_SECRET_HERE";

app.post("/create-order", async (req, res) => {
  const { amount, customer_name, customer_email } = req.body;

  try {
    const response = await axios.post(
      "https://api.cashfree.com/pg/orders",
      {
        order_id: "order_" + Date.now(),
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: "cust_" + Date.now(),
          customer_name,
          customer_email,
          customer_phone: "9999999999"
        }
      },
      {
        headers: {
          "x-client-id": CASHFREE_CLIENT_ID,
          "x-client-secret": CASHFREE_CLIENT_SECRET,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json(error.response.data);
  }
});

app.listen(3000, () => {
  console.log("Cashfree server running on port 3000");
});
