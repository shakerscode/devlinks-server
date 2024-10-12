const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5001;

// Check if environment variables are defined
if (!process.env.DB_USER || !process.env.DB_PASS) {
  console.error("Missing DB_USER or DB_PASS in environment variables.");
  process.exit(1); // Exit the process with failure code
}

const uploadRoute = require("./upload");
const { authRouter, validateJWT } = require("./auth");

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? "https://share-link-ruddy.vercel.app"
    : "http://localhost:5173";

 
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true); // Allow the origin if it's in the allowedOrigins list
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`)); // Block the request if not in the allowedOrigins
    }
  },
  credentials: true, // Allow credentials (cookies)
};

// Middleware configuration
app.use(
  cors({
    origin: allowedOrigins, // Your frontend origin
    credentials: true, // Allow credentials (cookies)
  })
);
app.use(cookieParser());

app.use(express.json());
app.use("/api", uploadRoute);
app.use("/api", authRouter);

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

// Connect to the MongoDB client and define routes
async function run() {
  try {
    await client.connect();
    // Define collections
    const userLinksCollection = client.db("devLinks").collection("userAllInfo");

    // Define a POST route to save links in the database
    app.post("/api/save-link", validateJWT, async (req, res) => {
      try {
        const { platform_name, platform_url } = req.body;

        // Validate the request data
        if (!platform_name || !platform_url) {
          return res
            .status(400)
            .json({ message: "Platform name and URL are required." });
        }

        // Validate platform URL using a simple regular expression
        const platformPattern = new RegExp(
          `^https:\\/\\/(www\\.)?${platform_name.toLowerCase()}\\.com\\/[A-Za-z0-9_-]+`
        );
        if (!platformPattern.test(platform_url)) {
          return res
            .status(400)
            .json({ message: "Invalid platform URL format." });
        }

        // Prepare the link object
        const linkData = {
          platform_name,
          platform_url,
          createdAt: new Date(),
        };

        // Insert the new link into the userLinks collection
        const result = await userLinksCollection.insertOne(linkData);
        res.status(201).json({
          message: "Link saved successfully!",
          linkId: result.insertedId,
        });
      } catch (error) {
        console.error("Failed to save link:", error);
        res.status(500).json({ message: "Failed to save link." });
      }
    });

    // Define a GET route to fetch all links (optional)
    app.get("/api/links", validateJWT, async (req, res) => {
      try {
        const links = await userLinksCollection.find({}).toArray();
        res.status(200).json(links);
      } catch (error) {
        console.error("Failed to fetch links:", error);
        res.status(500).json({ message: "Failed to fetch links." });
      }
    });

    //Delete a link list
    app.delete("/api/delete/:id", validateJWT, async (req, res) => {
      try {
        const { id } = req.params; // Extract the id from the request parameters

        // Ensure the ID is valid and can be used in MongoDB
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID format" });
        }

        // Delete the link from your collection (assuming you have a collection called 'userLinks')
        const result = await userLinksCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Link not found" });
        }

        res.status(200).json({ message: "Link deleted successfully" });
      } catch (error) {
        console.error("Error deleting link:", error);
        res.status(500).json({ message: "Failed to delete link" });
      }
    });

    //Update a link

    // Update a link
    app.patch("/api/update/:id", validateJWT, async (req, res) => {
      try {
        const { id } = req.params; // Extract the link id from the request parameters
        const { platform_name, platform_url } = req.body; // Extract fields to update from the request body

        // Check if the provided id is valid
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid link ID." });
        }
        console.log(platform_name, platform_url);

        // Build the update object based on fields provided in the body
        const updateFields = {};
        if (platform_name) {
          updateFields.platform_name = platform_name;
        }
        if (platform_url) {
          updateFields.platform_url = platform_url;
        }

        if (Object.keys(updateFields).length === 0) {
          return res
            .status(400)
            .json({ message: "No valid fields to update." });
        }

        // Use $set to update only the specified fields
        const result = await userLinksCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the link by ID
          { $set: updateFields } // Only update the provided fields
        );

        // Check if the link was found and updated
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Link not found." });
        }

        res.status(200).json({ message: "Link updated successfully." });
      } catch (error) {
        console.error("Failed to update link:", error);
        res.status(500).json({ message: "Failed to update link." });
      }
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  } finally {
    // Ensure that MongoDB client is closed on server shutdown or error
    process.on("SIGINT", async () => {
      await client.close();
      console.log("MongoDB client closed.");
      process.exit(0); // Exit gracefully
    });
  }
}

// Start the server and MongoDB connection
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World From devLinks!");
});

// Start the Express server
app.listen(port, () => {
  console.log(`devLinks app listening on port ${port}`);
});
