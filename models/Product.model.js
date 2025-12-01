import mongoose from "mongoose";

const colorVariantSchema = new mongoose.Schema({
  color: { type: String, required: true },
  images: [{ type: String, required: true }],
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String },

  // main display images (default color's image set)
  images: [{ type: String }],

  // basic arrays
  sizes: [{ type: String }],
  colors: [{ type: String }],

  description: { type: String },
  materials: [{ type: String }],

  gender: { type: String, enum: ["Men", "Women", "Unisex"] },
  category: { type: String },
  subcategory: { type: String },
  occasion: { type: String },

  // price structure
  price: { type: Number, required: true },
  offerprice: { type: Number, required: true },
  discountPrice: { type: Number, default: 0 },

  // reviews
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],

  // stock
  stock: { type: Number, default: 100 },

  // SEO slug
  slug: { type: String, unique: true },

  // Design + Fit filters
  styleType: { type: String, enum: ["solid", "printed", "typography"] },
  fit: { type: String },
  sleeve: { type: String },
  neck: { type: String },

  // color based galleries
  colorVariants: [colorVariantSchema],

}, { timestamps: true });

// Indexes
productSchema.index({ name: "text", brand: "text", description: "text" });
productSchema.index({ gender: 1, category: 1, subcategory: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ slug: 1 });

// auto-generate slug
productSchema.pre("save", function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

export default mongoose.model("Product", productSchema);
