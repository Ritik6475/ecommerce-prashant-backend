import express from 'express';
import Product from '../models/Product.model.js';
import Review from '../models/Review.model.js';
import { protect, optional } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filters and pagination
// @access  Public


router.get("/", async (req, res) => {
  try {
    console.log("Query Parameters:", req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};

    // ✅ Case-insensitive regex matching for main text fields
    const textFields = ["gender", "category", "subcategory", "occasion", "brand"];

    textFields.forEach((field) => {
      if (req.query[field]) {
        const value = req.query[field]
          .replace(/s$/, "") // remove trailing 's' (shirts → shirt)
          .trim();
        filter[field] = { $regex: new RegExp(value, "i") }; // case-insensitive
      }
    });

    // ✅ Price Range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.offerprice = {};
      if (req.query.minPrice) filter.offerprice.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.offerprice.$lte = parseFloat(req.query.maxPrice);
    }

    // ✅ Sizes (multiple)
    if (req.query.sizes) {
      const sizesArray = Array.isArray(req.query.sizes)
        ? req.query.sizes
        : req.query.sizes.split(",");
      filter.sizes = { $in: sizesArray.map((s) => s.trim().toUpperCase()) };
    }

    // ✅ Search query
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { brand: { $regex: req.query.search, $options: "i" } },
        { category: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // ✅ Sorting
    const sort = {};
    switch (req.query.sort) {
      case "price-low":
        sort.offerprice = 1;
        break;
      case "price-high":
        sort.offerprice = -1;
        break;
      case "rating":
        sort.rating = -1;
        break;
      default:
        sort.createdAt = -1;
        break;
    }

    // ✅ Fetch products
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-reviews");

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Product fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'name avatar' }
      });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product); // ✅ Return product directly
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'name avatar' }
      });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Add a review to a product
// @access  Private
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Rating and comment are required' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: product._id
    });

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You already reviewed this product' });
    }

    // Create review
    const review = await Review.create({
      user: req.user._id,
      product: product._id,
      rating: parseFloat(rating),
      comment
    });

    // Add review to product
    product.reviews.push(review._id);

    // Recalculate average rating
    const reviews = await Review.find({ product: product._id });
    const avgRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    product.rating = avgRating;
    product.reviewCount = reviews.length;

    await product.save();

    // Populate review with user data
    await review.populate('user', 'name avatar');

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/products/filters/options
// @desc    Get filter options (categories, brands, etc.)
// @access  Public

router.get('/filters/options', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    const subcategories = await Product.distinct('subcategory');
    const brands = await Product.distinct('brand');
    const genders = await Product.distinct('gender');
    const occasions = await Product.distinct('occasion');
    const sizes = await Product.distinct('sizes');
const fits = await Product.distinct('fit');
const sleeves = await Product.distinct('sleeve');
const materials = await Product.distinct('materials');
const ratings = [5,4,3,2,1];

   res.json({
  success: true,
  filters: {
    categories,
    subcategories,
    brands,
    genders,
    occasions,
    sizes: [...new Set(sizes.flat())],
    fits,
    sleeves,
    materials: [...new Set(materials.flat())],
    ratings

      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
