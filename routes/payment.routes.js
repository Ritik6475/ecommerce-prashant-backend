import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';
import Order from '../models/Order.model.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

/* ----------------------------
   Razorpay Initialization
----------------------------- */
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Razorpay keys are missing in environment variables');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ----------------------------
   CREATE RAZORPAY ORDER
----------------------------- */
router.post('/create-order', protect, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (order.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Payment already initiated' });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // 🔒 amount from DB only
      currency: 'INR',
      receipt: `order_${order._id}`
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({ success: true, order: razorpayOrder });
  } catch (error) {
    console.error('Create Razorpay Order Error:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

/* ----------------------------
   VERIFY PAYMENT
----------------------------- */
router.post('/verify', protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Payment already verified' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // 🔒 Fetch payment from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return res.status(400).json({ message: 'Payment not captured' });
    }

    if (payment.amount !== Math.round(order.totalAmount * 100)) {
      return res.status(400).json({ message: 'Payment amount mismatch' });
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;

    await order.save();

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});




router.get('/:paymentId', protect, async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    
    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Payment fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details'
    });
  }
});

export default router;
