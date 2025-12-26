import express from "express";
import multer from "multer";
import TryOnUsage from "../models/TryOnUsage.model.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP allowed"));
    }
    cb(null, true);
  },
});

router.post(
  "/try-on",
  protect,
  upload.fields([
    { name: "userImage", maxCount: 1 },
    { name: "productImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const alreadyUsed = await TryOnUsage.findOne({
        user: req.user._id,
        date: today,
      });

      if (alreadyUsed) {
        return res.status(429).json({
          success: false,
          message: "Try-on allowed only once per day",
        });
      }

      const userImage = req.files?.userImage?.[0];
      const productImage = req.files?.productImage?.[0];

      if (!userImage || !productImage) {
        return res.status(400).json({
          success: false,
          message: "Images missing",
        });
      }

      // ✅ Use native FormData (Node 18+)
      const formData = new FormData();
      formData.append(
        "image",
        new Blob([userImage.buffer], { type: userImage.mimetype }),
        "person.jpg"
      );
      formData.append(
        "image-apparel",
        new Blob([productImage.buffer], { type: productImage.mimetype }),
        "apparel.jpg"
      );

      const apiRes = await fetch(
        "https://api4ai.cloud/virtual-try-on/v1/results",
        {
          method: "POST",
          headers: {
            "X-API-KEY": process.env.API4AI_KEY,
          },
          body: formData,
        }
      );

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        console.error("API4AI ERROR:", errText);
        return res.status(500).json({
          success: false,
          message: "Try-on service failed",
        });
      }

      const result = await apiRes.json();

      await TryOnUsage.create({
        user: req.user._id,
        date: today,
      });

      res.json({ success: true, result });

    } catch (err) {
      console.error("TRY-ON ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Try-on failed",
      });
    }
  }
);

export default router;
