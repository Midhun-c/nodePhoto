import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import mongoose from "mongoose";
import { ObjectManager } from "@filebase/sdk";
import admin from "firebase-admin";
import verifyToken from "./verifyToken.js";

// Load environment variables
dotenv.config();


// Firebase Admin Setup
// const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });



// MongoDB & App Setup
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

// Mongoose Schema
const ImageMetadataSchema = new mongoose.Schema({
  email: { type: String, required: true },
  cid: { type: String, required: true },
  imageName: String,
  captureTime: String,
  location: String,
  deviceInfo: String,
  timestamp: String,
  fileType: String,
}, { timestamps: true });

const ImageMetadata = mongoose.model("ImageMetadata", ImageMetadataSchema);

// Filebase Setup
const upload = multer({ storage: multer.memoryStorage() });
const objectManager = new ObjectManager(
  process.env.FILEBASE_KEY,
  process.env.FILEBASE_SECRET,
  { bucket: process.env.FILEBASE_BUCKET }
);

// 🔒 Upload route
app.post("/upload", upload.single("image"), verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
    const imageName = req.body.imageName || req.file.originalname;
   // console.log(req);

    const uploadResponse = await objectManager.upload(imageName, req.file.buffer);
    const cid = uploadResponse.cid;

    const newImage = new ImageMetadata({
      email: userEmail,
      cid,
      imageName,
      captureTime: metadata.captureTime,
      location: metadata.location,
      deviceInfo: metadata.deviceInfo,
      timestamp: metadata.timestamp,
      fileType: req.file.mimetype,
    });

    await newImage.save();
    res.status(200).json({ message: "File uploaded successfully", cid });
  } catch (err) {
    console.error("❌ Upload Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📄 Secure metadata fetch by logged-in user
app.get("/metadata", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const metadata = await ImageMetadata.find({ email });
    res.json(metadata);
  } catch (err) {
    console.error("❌ Metadata Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

// Add this in your backend (no auth)
app.get("/metadata/:cid", async (req, res) => {
  try {
    const metadata = await ImageMetadata.findOne({ cid: req.params.cid });
    if (!metadata) {
      return res.status(404).json({ error: "Metadata not found" });
    }
    res.json(metadata);
  } catch (err) {
    console.error("❌ Public Metadata Error:", err.message);
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});


app.get("/", (req, res) => res.send("✅ Backend is up and running"));
app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
