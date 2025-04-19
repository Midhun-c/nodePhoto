// verifyToken.js
import admin from "./firebaseAdmin.js";

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error("❌ Token verification error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export default verifyToken;
