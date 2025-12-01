import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.model.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const isProd = process.env.NODE_ENV === "production";


const cookieOptions = {
  httpOnly: true,
  secure: isProd,            // ONLY true on production
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};


// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// -----------------------------
// REGISTER
// -----------------------------
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('phone').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    // Generate token and set cookie
    const token = generateToken(user._id);

    res
      .cookie("token", token, cookieOptions)
      .status(201)
      .json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        }
      });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -----------------------------
// LOGIN
// -----------------------------
router.post('/login', [
  body('identifier').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { identifier, password } = req.body;

    const query = identifier.includes('@')
      ? { email: identifier }
      : { phone: identifier };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token and set cookie
    const token = generateToken(user._id);

    res
      .cookie("token", token, cookieOptions)
      .status(200)
      .json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -----------------------------
// LOGOUT
// -----------------------------
router.post('/logout', (req, res) => {
  res.clearCookie("token", { ...cookieOptions, maxAge: 0 });
  res.json({ success: true, message: "Logged out" });
});

// -----------------------------
// GET LOGGED-IN USER
// -----------------------------
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('wishlist', 'name images price offerprice')
      .populate('cart.product', 'name images price offerprice');

    res.json({ success: true, user });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -----------------------------
// UPDATE PROFILE
// -----------------------------
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

