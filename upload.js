const express = require("express");
const cloudinary = require("./cloudinaryConfig");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { validateJWT } = require("./auth");
const { ObjectId, MongoClient, ServerApiVersion } = require("mongodb");

const router = express.Router();
//Creating a uploads folder so that we can put our images for a while here
const upload = multer({ dest: "uploads/" });

//MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2nr8q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Creating a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

client.connect();

//Database collections
const usersCollection = client.db("devLinks").collection("users");

// POST route to handle image uploads and profile updates
router.post(
  "/update-profile",
  validateJWT,
  upload.single("image"),
  async (req, res) => {
    try {
      // Get user ID from JWT token
      const userId = req.user.userId;
      const { first_name, last_name } = req.body;

      // Default to existing image URL if provided
      let imageUrl = req.body.imageUrl;

      // Check if an image is uploaded, if yes, upload it to Cloudinary
      if (req.file) {
        const filePath = path.join(__dirname, req.file.path);

        const result = await cloudinary.uploader.upload(filePath, {
          folder: "user_images",
          use_filename: true,
        });

        imageUrl = result.secure_url;

        // Delete the temporary file from the server after upload
        fs.unlinkSync(filePath);
      }

      // Update the user information in the database
      const updatedUser = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
          $set: {
            first_name,
            last_name,
            imageUrl,
          },
        },
        { returnOriginal: false }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser.value,
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ message: "Profile update failed" });
    }
  }
);

module.exports = router;
