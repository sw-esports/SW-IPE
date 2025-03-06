const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
app.use(express.json({ limit: "50mb" })); // Increased limit for larger base64 images
app.use(express.static("public"));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio uploads with proper file extension
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    const extension = file.originalname.split('.').pop() || 'webm';
    cb(null, `audio_${Date.now()}.${extension}`);
  }
});

const upload = multer({ storage: storage });

// Endpoint to handle image uploads
app.post("/upload-image", (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).send("No image data received");

  try {
    // Handle both PNG and JPEG formats
    let base64Data;
    let extension;
    
    if (image.startsWith('data:image/jpeg')) {
      base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
      extension = 'jpg';
    } else {
      base64Data = image.replace(/^data:image\/png;base64,/, "");
      extension = 'png';
    }
    
    const filePath = path.join(uploadsDir, `capture_${Date.now()}.${extension}`);

    fs.writeFile(filePath, base64Data, "base64", (err) => {
      if (err) {
        console.error("Error saving image:", err);
        return res.status(500).send("Error saving image");
      }
      console.log(`Image saved: ${filePath}`);
      res.send("Image uploaded successfully!");
    });
  } catch (err) {
    console.error("Error processing image:", err);
    res.status(500).send("Error processing image");
  }
});

// Endpoint to handle audio uploads using multer
app.post("/upload-audio", upload.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).send("No audio file received");
  console.log(`Audio saved: ${req.file.path}`);
  res.send("Audio uploaded successfully!");
});

// Endpoint to handle tracking data
app.post("/track", (req, res) => {
  const userData = req.body;
  console.log("User Data Received:", userData);
  
  // Format the data nicely before saving
  const formattedData = JSON.stringify(userData, null, 2);
  fs.appendFileSync("user-data.txt", formattedData + "\n---\n");
  
  res.send("User data saved!");
});

// Start the server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
