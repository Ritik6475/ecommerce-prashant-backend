import mongoose from "mongoose";

const TryOnUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

TryOnUsageSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model("TryOnUsage", TryOnUsageSchema);
