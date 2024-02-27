import { Server } from "socket.io";
import { createServer } from "http";
import SessionStore from "./SessionStore";
import MessageStore from "./MessageStore";
const { instrument } = require("@socket.io/admin-ui");
const crypto = require("crypto");

const messageStore = new MessageStore();
const store = new SessionStore();
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://admin.socket.io"],
  },
});

instrument(io, {
  auth: false,
  mode: "development",
});

io.on('connection', (socket) => {
  // Emit the "notification" event every 5 seconds
  // const intervalId = setInterval(() => {
  //   socket.emit('notification', {
  //     message: 'New content is available!',
  //   });
  //   console.log('Notification emitted');
  // }, 5000);
 socket.on('message', (message) => {
    console.log('Received message:', message);
    io.emit('message', message); // Broadcast the message to all connected sockets
  });

  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});



 // Emit a sample notification after 5 seconds
 setTimeout(() => {
  io.emit('notification', {
    message: 'New content is available!',
  });
  console.log('notification')
},5000);

httpServer.listen(3001, () => {
  console.log('WebSocket server is listening on port - 3001');
});

