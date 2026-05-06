const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

// Import Socket Event Handlers
const partyEvents = require('./socket/partyEvents');
const chatEvents = require('./socket/chatEvents');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// Socket.IO Configuration
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// API Routes for party statistics
app.get('/api/parties', (req, res) => {
  const partyController = require('./controllers/partyController');
  const parties = partyController.getAllParties();
  res.json({
    success: true,
    parties: parties,
    totalParties: parties.length
  });
});

app.get('/api/party/:partyId', (req, res) => {
  const partyController = require('./controllers/partyController');
  const party = partyController.getParty(req.params.partyId);

  if (!party) {
    return res.status(404).json({
      success: false,
      message: 'Party not found'
    });
  }

  res.json({
    success: true,
    party: party.getPartyInfo(),
    members: partyController.getPartyMembers(req.params.partyId)
  });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register event handlers
  partyEvents(io, socket);
  chatEvents(io, socket);

  // Connection event
  socket.emit('connected', {
    socketId: socket.id,
    message: 'Connected to server'
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🎵 Jamming Room Server running on http://localhost:${PORT}`);
  console.log(`🚀 Socket.IO ready for real-time communication`);
});

module.exports = { app, io };
