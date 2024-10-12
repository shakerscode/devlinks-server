// const express = require("express");
// const cloudinary = require("./cloudinaryConfig"); // Import Cloudinary configuration
// const multer = require("multer"); // Import multer for file handling
// const path = require("path");
// const fs = require("fs");
// const { validateJWT } = require("./auth");

// const router = express.Router();

// // Configure multer to store files temporarily before uploading to Cloudinary
// const upload = multer({ dest: "uploads/" });

// // POST route to handle image uploads
// router.post(
//   "/api/upload-image",
//   validateJWT,
//   upload.single("image"),
//   async (req, res) => {
//     try {
//       // Check if file is provided
//       if (!req.file) {
//         return res.status(400).json({ message: "No image file provided." });
//       }

//       // Get the file path
//       const filePath = path.join(__dirname, req.file.path);

//       // Upload the image to Cloudinary
//       const result = await cloudinary.uploader.upload(filePath, {
//         folder: "user_images", // Optional folder name in Cloudinary
//         use_filename: true,
//       });

//       // Delete the temporary file from the server after upload
//       fs.unlinkSync(filePath);

//       // Return the uploaded image URL
//       res.status(200).json({ imageUrl: result.secure_url });
//     } catch (error) {
//       console.error("Failed to upload image:", error);
//       res.status(500).json({ message: "Image upload failed." });
//     }
//   }
// );

// module.exports = router;


const express = require("express");
const cloudinary = require("./cloudinaryConfig");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { validateJWT } = require("./auth");
const { ObjectId, MongoClient, ServerApiVersion } = require("mongodb"); // Assuming you're using MongoDB

const router = express.Router();
const upload = multer({ dest: "uploads/" });


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2nr8q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

client.connect();

const usersCollection = client.db("devLinks").collection("users");


// POST route to handle image uploads and profile updates
router.post(
  "/update-profile",
  validateJWT,
  upload.single("image"),
  async (req, res) => {
    try {
      const userId = req.user.userId; // Get user ID from JWT token
      const { first_name, last_name } = req.body; // Get first_name and last_name from the request body
      let imageUrl = req.body.imageUrl; // Default to existing image URL if provided 
      // Check if an image is uploaded, if yes, upload it to Cloudinary
      if (req.file) {
        const filePath = path.join(__dirname, req.file.path);

        const result = await cloudinary.uploader.upload(filePath, {
          folder: "user_images",
          use_filename: true,
        });

        imageUrl = result.secure_url; // Use the uploaded image URL

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
            imageUrl, // Save the new image URL
          },
        },
        { returnOriginal: false }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "Profile updated successfully", user: updatedUser.value });
    } catch (error) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ message: "Profile update failed" });
    }
  }
);

module.exports = router;
