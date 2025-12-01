import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post("/googlelogin", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        avatar: picture,
        authType: "google",
        password: null,
      });
    }

    const appToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ✔ Set secure cookie
    res.cookie("token", appToken, cookieOptions);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(400).json({
      success: false,
      message: "Google login failed",
    });
  }
});

export default router;
