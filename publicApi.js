const express = require("express");
const { MongoClient } = require("mongodb");

const publicRouter = express.Router();

// MongoDB connection URI (assuming this is already set up)
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2nr8q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri);

// Database and collections
const usersCollection = client.db("devLinks").collection("users");
const userLinksCollection = client.db("devLinks").collection("userAllInfo");

// Public profile API route
publicRouter.get("/public-profile/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Fetch the user by username
    const user = await usersCollection.findOne(
      { user_name: username },
      { projection: { password: 0 } } // Exclude the password field
    );

    // If user not found, return 404
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch all links created by the user
    const links = await userLinksCollection
      .find({ userId: user._id?.toString() })
      .toArray();

    // Send the public profile data
    res.status(200).json({ user, links });
  } catch (error) {
    console.error("Failed to fetch public profile:", error);
    res.status(500).json({ message: "Failed to fetch public profile." });
  }
});

module.exports = publicRouter;
