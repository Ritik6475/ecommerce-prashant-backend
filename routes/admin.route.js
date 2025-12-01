// routes/adminOrders.routes.js
import express from 'express';
import Order from '../models/Order.model.js';
import adminprotect from '../middleware/adminsecret.js';

const router = express.Router();

// All routes require the admin secret header

// GET /api/admin/orders


router.use(adminprotect);

router.get("/verify-secret", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: "Invalid admin secret" });
  }
  return res.json({ success: true });
});


router.get('/orders',async (req, res) => {
  try {
    const { page = 1, limit = 12, status, paymentStatus, q } = req.query;
    const filter = {};

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (q) {
      // search by email, phone, name, or orderId (mongo _id)
      filter.$or = [
        { 'address.email': { $regex: q, $options: 'i' } },
        { 'address.phone': { $regex: q, $options: 'i' } },
        { 'address.firstName': { $regex: q, $options: 'i' } },
        { 'address.lastName': { $regex: q, $options: 'i' } },
        // allow raw _id search
        { _id: q.match(/^[0-9a-fA-F]{24}$/) ? q : undefined },
      ].filter(Boolean);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .populate('items.product', 'name images price offerprice brand')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price offerprice brand materials');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/orders/:id/status
// body: { orderStatus?, paymentStatus? }
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const allowedOrder = ['processing', 'shipped', 'delivered', 'cancelled'];
    const allowedPay = ['pending', 'paid', 'failed'];

    const update = {};
    if (orderStatus) {
      if (!allowedOrder.includes(orderStatus))
        return res.status(400).json({ success: false, message: 'Invalid orderStatus' });
      update.orderStatus = orderStatus;
    }
    if (paymentStatus) {
      if (!allowedPay.includes(paymentStatus))
        return res.status(400).json({ success: false, message: 'Invalid paymentStatus' });
      update.paymentStatus = paymentStatus;
    }

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price offerprice');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/admin/orders/:id/cancel
router.put('/orders/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = 'cancelled';
    // business rule: optionally revert paymentStatus if not refunded integration
    if (order.paymentStatus === 'paid') {
      // mark as failed or keep paid (depends on your refund flow). We'll keep as 'paid' and let ops refund manually.
    }

    await order.save();
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', async (_req, res) => {
  try {
    const [counts, revenueAgg] = await Promise.all([
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ]),
    ]);

    const byStatus = counts.reduce((acc, c) => {
      acc[c._id] = c.count;
      return acc;
    }, {});

    res.json({
      success: true,
      byStatus,
      revenue: revenueAgg[0]?.revenue || 0,
      totalOrders: Object.values(byStatus).reduce((a, b) => a + b, 0),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
