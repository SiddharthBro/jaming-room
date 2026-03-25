const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("send-song", ({ roomId, link }) => {
    io.to(roomId).emit("receive-song", link);
  });

});

server.listen(5000, () => {
  console.log("Server running on 5000");
});