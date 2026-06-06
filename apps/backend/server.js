const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
// Initialize database
db.init();
// Health check
app.get('/api/health', (req, res) => {
res.json({
status: 'healthy',
timestamp: new Date().toISOString(),
uptime: process.uptime()
});
});
// Get all items
app.get('/api/items', (req, res) => {
try {
const items = db.getAllItems();
res.json({ success: true, data: items });
} catch (error) {
res.status(500).json({ success: false, error: error.message });
}
});
// Get single item
app.get('/api/items/:id', (req, res) => {
try {
const item = db.getItem(req.params.id);
if (!item) {
return res.status(404).json({ success: false, error: 'Item not found' });
}
res.json({ success: true, data: item });
} catch (error) {
res.status(500).json({ success: false, error: error.message });
}
});
// Create item
app.post('/api/items', (req, res) => {
try {
const { title, description } = req.body;
if (!title) {
  return res.status(400).json({ success: false, error: 'Title is required' });
}

const item = db.createItem(title, description);
res.status(201).json({ success: true, data: item });
} catch (error) {
res.status(500).json({ success: false, error: error.message });
}
});
// Update item
app.put('/api/items/:id', (req, res) => {
try {
const { title, description } = req.body;
const item = db.updateItem(req.params.id, title, description);
if (!item) {
  return res.status(404).json({ success: false, error: 'Item not found' });
}

res.json({ success: true, data: item });
} catch (error) {
res.status(500).json({ success: false, error: error.message });
}
});
// Delete item
app.delete('/api/items/:id', (req, res) => {
try {
const success = db.deleteItem(req.params.id);
if (!success) {
  return res.status(404).json({ success: false, error: 'Item not found' });
}

res.json({ success: true, message: 'Item deleted' });
} catch (error) {
res.status(500).json({ success: false, error: error.message });
}
});
// Server info endpoint
app.get('/api/info', (req, res) => {
res.json({
version: '1.0.0',
environment: process.env.NODE_ENV || 'development',
deployment: process.env.DEPLOYMENT_TYPE || 'local',
timestamp: new Date().toISOString()
});
});
// Serve frontend index.html for root path
app.get('/', (req, res) => {
res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
// Error handling
app.use((err, req, res, next) => {
console.error(err);
res.status(500).json({
success: false,
error: 'Internal server error',
message: process.env.NODE_ENV === 'development' ? err.message : undefined
});
});
// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`API Health: http://localhost:${PORT}/api/health`);
  console.log(`Frontend: http://localhost:${PORT}`);
});
module.exports = app;

