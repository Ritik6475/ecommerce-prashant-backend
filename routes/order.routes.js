import express from 'express';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';

import { protect } from '../middleware/auth.js';


const router = express.Router();

/* ----------------------------
   GET USER ORDERS
----------------------------- */
router.get('/', protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 });

  res.json({ success: true, orders });
});

/* ----------------------------
   GET SINGLE ORDER
----------------------------- */
router.get('/:id', protect, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('items.product', 'name images brand');

  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  res.json({ success: true, order });
});

/* ----------------------------
   CREATE ORDER (NO TOTAL FROM FRONTEND)
----------------------------- */
router.post('/', protect, async (req, res) => {
  const { items, address, deliveryOption, orderNotes } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ message: 'No items in order' });
  }

  if (!address) {
    return res.status(400).json({ message: 'Shipping address required' });
  }

  // 🔒 Calculate total on server
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const order = await Order.create({
    user: req.user._id,
    items,
    address,
    deliveryOption,
    orderNotes,
    totalAmount,
    paymentStatus: 'pending',
    orderStatus: 'processing'
  });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { orders: order._id }
  });

  await order.populate('items.product', 'name images brand');

  res.status(201).json({ success: true, order });
});

/* ----------------------------
   CANCEL ORDER
----------------------------- */
router.put('/:id/cancel', protect, async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ message: 'Paid orders cannot be cancelled' });
  }

  order.orderStatus = 'cancelled';
  await order.save();

  res.json({ success: true, order });
});

export default router;
