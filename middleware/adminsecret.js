export default function adminProtect(req, res, next) {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized - Admin secret missing or invalid" });
  }
  next();
}
