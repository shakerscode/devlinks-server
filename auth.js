const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//Express router for authentication routes
const authRouter = express.Router();

// MongoDB connection URI
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

//MongoDB Database collection for users
const usersCollection = client.db("devLinks").collection("users");

// JWT Validation Middleware
// This middleware will run each time when we make api req to any protected api. It will check if there is any token or not. We check toke in two ways. One is we set it by default when we make api req and it automatically return the token. Another one is we send a token from frontend and it checks that. The reason I used same token twice is sometime the default token gives some issues. So for avoiding unusual issues we does that. And we used HttpOnly which is more secure and can't access by the frontend.

const validateJWT = (req, res, next) => {
  let token = req.cookies?.authToken;

  // If no cookie token, check for Authorization header (frontendToken)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  // If no token is provided in either place, return an error
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  // Verify the token (whether from cookie or header)
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    // Store decoded token in request object
    req.user = decoded;
    next();
  });
};

// User registration route
authRouter.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Generate the base username from the email
    const user_name = email.split("@")[0].toLowerCase();
    let userNameExists = true;
    let counter = 1;

    // Check if the username is unique
    while (userNameExists) {
      const existingUserName = await usersCollection.findOne({ user_name });

      if (existingUserName) {
        // If username exists, append a number to make it unique
        user_name = `${baseUserName}${counter}`;
        counter++;
      } else {
        userNameExists = false;
      }
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in DB
    const newUser = {
      first_name,
      last_name,
      email,
      password: hashedPassword,
      user_name,
    };
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
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000, 
    });

    res.status(201).json({ message: "User registered successfully.", token });
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
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 24 * 60 * 60 * 1000,  
    });

    res.status(200).json({ message: "Sign-in successful.", token });
  } catch (error) {
    console.error("Error signing in user:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// User logout route
authRouter.post("/logout", (req, res) => {
  res.clearCookie("authToken");  
  res.status(200).json({ message: "Logged out successfully." });
});

// User profile route which checks each time a user is authenticated or not
authRouter.get("/user/profile", async (req, res) => {
  try {
    // Check for authToken in cookies
    let token = req.cookies.authToken; 

    // Check for frontendToken in Authorization header if no authToken found
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];  
      }
    }

    // If no token is provided, return 401 Unauthorized
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
