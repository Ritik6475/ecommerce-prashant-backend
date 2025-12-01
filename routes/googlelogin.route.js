import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// -------------------------------------------
// GOOGLE LOGIN USING SECURE HTTP-ONLY COOKIES
// -------------------------------------------

router.post("/googlelogin", async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google token
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

    // Create JWT for our app
    const appToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ----------------------------------------------------------
    // SET TOKEN AS SECURE HTTP-ONLY COOKIE
    // ----------------------------------------------------------
   res.cookie("token", appToken, {
  httpOnly: true,
  secure: false,          // IMPORTANT for localhost
  sameSite: "lax",        // SAME as normal login
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    // Send user info (NO TOKEN)
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
