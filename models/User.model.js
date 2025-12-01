import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
    password: {
    type: String,
    required: function () {
      return this.authType !== "google";
    },
  },

    authType: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  phone: { type: String, unique: true, sparse: true },
  
  // Google OAuth
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String },

  // Wishlist stores product IDs
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

  // Cart items store product + qty + size
  cart: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      size: { type: String },
      color:{type:String},
      quantity: { type: Number, default: 1 }
    }
  ],

  // Orders reference order documents
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
}, { timestamps: true });

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

export default mongoose.model("User", userSchema);
