const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

let rooms = {};

io.on('connection', (socket) => {
  console.log("User connected:", socket.id);

  // Create Room
  socket.on('create-room', (roomId) => {
    rooms[roomId] = {
      host: socket.id,
      song: '',
      isPlaying: false,
      currentTime: 0
    };
    socket.join(roomId);
  });

  // Join Room
  socket.on('join-room', (roomId) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      socket.emit('sync', rooms[roomId]);
    }
  });

  // Play
  socket.on('play', ({ roomId, currentTime }) => {
    rooms[roomId].isPlaying = true;
    rooms[roomId].currentTime = currentTime;
    io.to(roomId).emit('play', currentTime);
  });

  // Pause
  socket.on('pause', ({ roomId, currentTime }) => {
    rooms[roomId].isPlaying = false;
    rooms[roomId].currentTime = currentTime;
    io.to(roomId).emit('pause', currentTime);
  });

  // Change Song
  socket.on('change-song', ({ roomId, song }) => {
    rooms[roomId].song = song;
    io.to(roomId).emit('change-song', song);
  });

  // Chat
  socket.on('chat-message', ({ roomId, msg }) => {
    io.to(roomId).emit('chat-message', msg);
  });

  socket.on('disconnect', () => {
    console.log("User disconnected");
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});