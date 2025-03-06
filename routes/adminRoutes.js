const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Auth middleware to verify admin token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Replace with your actual token validation logic
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  next();
};

// Admin page route - now uses EJS
router.get('/admin', (req, res) => {
  res.render('admin', {
    title: 'Admin Dashboard'
  });
});

// Route to get all uploaded files as JSON
router.get('/uploads', authMiddleware, (req, res) => {
  const uploadsPath = path.join(__dirname, '../public/uploads');
  
  fs.readdir(uploadsPath, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res.status(500).json({ error: 'Failed to read uploads directory' });
    }
    
    try {
      const fileStats = files.map(filename => {
        const filePath = path.join(uploadsPath, filename);
        const stats = fs.statSync(filePath);
        
        return {
          name: filename,
          date: stats.mtime,
          size: stats.size,
        };
      });
      
      res.json(fileStats);
    } catch (error) {
      console.error("Error processing file stats:", error);
      res.status(500).json({ error: 'Error processing file information' });
    }
  });
});

// Add a direct file access route for testing
router.get('/test-file/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../public/uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Add route to delete a file
router.delete('/uploads/:filename', authMiddleware, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../public/uploads', filename);
  
  // Check for path traversal attempts
  const normalizedPath = path.normalize(filePath);
  const uploadsDir = path.join(__dirname, '../public/uploads');
  
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

module.exports = router;
