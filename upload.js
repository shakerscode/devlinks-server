const express = require("express");
const cloudinary = require("./cloudinaryConfig"); // Import Cloudinary configuration
const multer = require("multer"); // Import multer for file handling
const path = require("path");
const fs = require("fs");
const { validateJWT } = require("./auth");

const router = express.Router();

// Configure multer to store files temporarily before uploading to Cloudinary
const upload = multer({ dest: "uploads/" });

// POST route to handle image uploads
router.post(
  "/api/upload-image",
  validateJWT,
  upload.single("image"),
  async (req, res) => {
    try {
      // Check if file is provided
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided." });
      }

      // Get the file path
      const filePath = path.join(__dirname, req.file.path);

      // Upload the image to Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "user_images", // Optional folder name in Cloudinary
        use_filename: true,
      });

      // Delete the temporary file from the server after upload
      fs.unlinkSync(filePath);

      // Return the uploaded image URL
      res.status(200).json({ imageUrl: result.secure_url });
    } catch (error) {
      console.error("Failed to upload image:", error);
      res.status(500).json({ message: "Image upload failed." });
    }
  }
);

module.exports = router;
