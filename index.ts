import { Server } from "socket.io";
import { createServer } from "http";
import SessionStore from "./SessionStore";
import MessageStore from "./MessageStore";
import axios from "axios";
import cron from "node-cron";

const { instrument } = require("@socket.io/admin-ui");
const crypto = require("crypto");

const messageStore = new MessageStore();
const store = new SessionStore();
const httpServer = createServer();

function logMessage() {
  console.log("Cron job executed at:", new Date().toLocaleString());
}
cron.schedule("* * * * *", () => {
  logMessage();
});
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:8000",
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

interface CandlestickData {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  trading_crypto: string;
  trading_fiat: string;
  volume: string;
}
/** https://api.bitget.com/api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1min&startTime=&limit=60 */

const fetchAndEmitCandlestickData = async () => {
  const time = new Date().getTime() - 60 * 60 * 1000;
  try {
    // const response = await fetch(
    //   `https://api.bitget.com/api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1min&startTime=${time}&limit=60`
    // );
    const response = await fetch(
      `https://api.bitget.com/api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1min&limit=60`
    );
    const newData = await response.json();
    const formattedData = formatCandlestickData(newData.data);
    await submitDataToOtherAPI(formattedData, time);
    // console.log(formattedData)
  } catch (error) {
    console.error("Error fetching candlestick data:", error);
  }
};

const fetchTradeOpen = async () => {
  const time = new Date().getTime() - 60 * 60 * 1000;
  try {
    const response = await fetch(
      `https://api.bitget.com/api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1min&limit=60`
    );
    const newData = await response.json();
    const formattedData = formatCandlestickData(newData.data);
    await submitDataToOtherAPI(formattedData, time);
    // console.log(formattedData)
  } catch (error) {
    console.error("Error fetching candlestick data:", error);
  }
};

const formatCandlestickData = (data: string[][]): CandlestickData[] => {
  // console.log(data)
  return data.map((candlestick) => ({
    timestamp: candlestick[0],
    open: candlestick[1],
    high: candlestick[2],
    low: candlestick[3],
    close: candlestick[4],
    trading_crypto: candlestick[5],
    trading_fiat: candlestick[6],
    volume: candlestick[7],
  }));
};

const submitDataToOtherAPI = async (data: CandlestickData[], time: any) => {
  const postData = {
    candlestickData: data,
    currentTime: time,
  };
  try {
    // Replace the URL with the endpoint of the other API and modify the submission logic as needed
    // const response = await axios.post("https://justview.online/api/trading/post-price", postData);
    const response = await axios.post(
      "http://127.0.0.1:8000/api/trading/post-price",
      postData
    );
    console.log(response.data);
    if (response.status == 200) {
      console.log("Data submitted successfully to the other API");
    } else {
      console.error("Failed to submit data to the other API");
    }
  } catch (error) {
    console.error("Error submitting data to the other API:", error);
  }
};
const startFetchingData = () => {
  // Fetch and emit candlestick data immediately upon starting the script
  fetchAndEmitCandlestickData();
  // Schedule interval to fetch and emit candlestick data every 5 seconds
  setInterval(fetchAndEmitCandlestickData, 1000);
};

io.on("connection", (socket: any) => {
  // Emit the "notification" event every 5 seconds
  // const intervalIdD = setInterval(() => {
  //   socket.emit("notification", {
  //     message: "New content is available!",
  //   });
  //   console.log("Notification emitted");
  // }, 1000);

  console.log("New connection:", socket.id);

  socket.on("push-notification", (message: string) => {
    console.log("Received Data:", message);
    io.emit("push-notification", message); // Broadcast the message to all connected sockets
  });

  socket.on("message", (message: string) => {
    console.log("Received message:", message);
    io.emit("message", message); // Broadcast the message to all connected sockets
  });

  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
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
  startFetchingData();
});
