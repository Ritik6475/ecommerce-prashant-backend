import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import compression from "compression";


// Import routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminOrdersRoutes from './routes/admin.route.js';
import searchRoutes from './routes/search.routes.js';
import googleauthRoutes from './routes/googleauth.route.js';
import googleloginRoutes from './routes/googlelogin.route.js';
// ...existing code...
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS must be applied before routes and before any catch-all 404
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Admin-Secret'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// handle preflight for all routes
app.options('*', cors(corsOptions));

// Basic middlewares (parsing, cookies) should come early
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// -------------------------
// 🔐 Security Middlewares
// -------------------------
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiter, sanitize, xss, hpp, compression, etc.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: "Too many requests, try again later." });
app.use(limiter);
app.use(mongoSanitize());
app.use(xssClean());
app.use(hpp());
app.disable("x-powered-by");
app.use(compression());

// -------------------------
// Routes (register AFTER CORS and body parsers)
// -------------------------
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminOrdersRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/googleauth", googleauthRoutes);
app.use("/api/googlelogin", googleloginRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 404 — must be after routes
app.all("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// -------------------------
// GLOBAL ERROR HANDLER
// -------------------------
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  return res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Secure server running on port ${PORT}`);
});

