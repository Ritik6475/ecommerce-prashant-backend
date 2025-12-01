import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      size: { type: String },
      color: { type: String },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],

  totalAmount: { type: Number, required: true },

  address: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    street: String
  },

  paymentStatus: { 
    type: String, 
    enum: ["pending", "paid", "failed"], 
    default: "pending" 
  },
  paymentId: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },

  orderStatus: { 
    type: String, 
    enum: ["processing", "shipped", "delivered", "cancelled"], 
    default: "processing" 
  },

}, { timestamps: true });

// Index for faster queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

export default mongoose.model("Order", orderSchema);
