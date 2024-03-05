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
    origin: [
      "http://localhost:3000",
      "https://admin.socket.io",
      "http://167.114.115.146:3009",
      "https://7trade.justview.online",
    ],
    methods: ["GET", "POST"],
  },
});

instrument(io, {
  auth: false,
  mode: "development",
});

io.on("connection", (socket) => {
  // Emit the "notification" event every 5 seconds
  // const intervalIdD = setInterval(() => {
  //   socket.emit("notification", {
  //     message: "New content is available!",
  //   });
  //   console.log("Notification emitted");
  // }, 1000);

  // Fetch candlestick data and emit to the client
  const fetchCandlestickData = async () => {
    try {
      const response = await fetch(
        "https://trade.cex.io/api/spot/rest-public/get_candles",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pair: "BTC-USD",
            fromISO: new Date().getTime() - 60 * 60 * 1000,
            limit: 60,
            dataType: "bestAsk",
            resolution: "1m",
          }),
        }
      );
      const newData = await response.json();
      const formattedData = newData.data.map((item: any) => [
        new Date(item.timestamp).getTime(), // Convert timestamp to milliseconds
        item.open,
        item.high,
        item.low,
        item.close,
      ]);
      io.emit("candlestickData", formattedData);
    } catch (error) {}
  };
  // Emit candlestick data every 5 seconds
  const intervalId = setInterval(fetchCandlestickData, 1000);

  socket.on("message", (message) => {
    console.log("Received message:", message);
    io.emit("message", message); // Broadcast the message to all connected sockets
  });

  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    clearInterval(intervalId); // Clear the interval when a user disconnects
    // clearInterval(intervalIdD); // Clear the interval when a user disconnects
  });
});

// Emit a sample notification after 5 seconds
setTimeout(() => {
  io.emit("notification", {
    message: "New content is available!",
  });
  console.log("notification");
}, 5000);

httpServer.listen(3009, () => {
  console.log("WebSocket server is listening on port - 3009");
});
