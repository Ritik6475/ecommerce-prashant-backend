import express from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// 👌 Create OAuth Client
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

// STEP 1 → Send user to Google Login Page
router.get("/google", (req, res) => {
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["email", "profile"],
    redirect_uri: process.env.GOOGLE_REDIRECT_URL,
  });

  return res.redirect(url);
});

// STEP 2 → Google redirects back here
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for tokens
    const { tokens } = await client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URL,
    });

    // Verify and decode id_token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        avatar: picture,
        password: null,
        authType: "google",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect to frontend with token
    return res.redirect(
      `${process.env.FRONTEND_URL}/google-success?token=${token}`
    );
  } catch (err) {
    console.error("GOOGLE ERROR:", err);
    return res.send("Google Login Failed: " + err.message);
  }
});

export default router;
