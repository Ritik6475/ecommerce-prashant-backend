import express from "express";
import Product from "../models/Product.model.js";
const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 16;
    const skip = (page - 1) * limit;

    if (!q) return res.json({ products: [] });

    const words = q.toLowerCase().split(/\s+/);

    let minPrice = 0;
    let maxPrice = Infinity;

    // Detect price keywords
    const priceMatch = q.match(/(under|below|less|upto|max)\s+(\d+)/i);
    if (priceMatch) {
      maxPrice = Number(priceMatch[2]);
    }

    // Base text condition
    let filters = {
      $and: [
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { brand: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { category: { $regex: q, $options: "i" } },
            { colors: { $elemMatch: { $regex: q, $options: "i" } } },
          ],
        },
        { offerprice: { $gte: minPrice, $lte: maxPrice } }
      ]
    };

    const products = await Product.find(filters)
      .select("name brand offerprice images")
      .skip(skip)
      .limit(limit);

    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

export default router;
