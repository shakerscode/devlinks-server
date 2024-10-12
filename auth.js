const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const authRouter = express.Router(); // Create an Express router for authentication routes

// Replace with your MongoDB connection string
// MongoDB connection URI
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

// JWT Validation Middleware
const validateJWT = (req, res, next) => {
  const token = req?.cookies?.authToken; // Get the token from cookies
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = decoded; // Store decoded token in request object
    next();
  });
};

// User registration route
authRouter.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user document
    const newUser = { first_name, last_name, email, password: hashedPassword };
    await usersCollection.insertOne(newUser);

    // Create a JWT token
    const token = jwt.sign(
      { email, userId: newUser._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );

    // Set the token as an HttpOnly cookie
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hour
    });

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// User sign-in route
authRouter.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Create a JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Set the token as an HttpOnly cookie
    res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hour
      });
      
    res.status(200).json({ message: "Sign-in successful." });
  } catch (error) {
    console.error("Error signing in user:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// User logout route
authRouter.post("/logout", (req, res) => {
  res.clearCookie("authToken"); // Clear the JWT cookie
  res.status(200).json({ message: "Logged out successfully." });
});

// Protect a backend route with validateJWT
authRouter.get("/user/profile", async (req, res) => {
  try {
      console.log(req.cookies.authToken);
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    
    // Verify JWT and extract user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Fetch the user profile from the database
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } } // Exclude the password field
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to fetch user profile:", error); // Log the error details
    res.status(500).json({ message: "Failed to fetch user profile." });
  }
});

// Export authRouter and validateJWT middleware
module.exports = { authRouter, validateJWT };
