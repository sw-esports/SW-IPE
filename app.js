const express = require('express');
const app = express();
const path = require('path');

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add a specific route for uploads to ensure they're accessible
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Import routes
const adminRoutes = require('./routes/adminRoutes');

// Use routes
app.use('/', adminRoutes);

// Start server if not imported by another file
if (!module.parent) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
