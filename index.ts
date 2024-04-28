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
      "http://69.87.223.182:3009",
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

const fetchAndEmitCandlestickData = async () => {
  const time = new Date().getTime() - 60 * 60 * 1000;
  try {
    const response = await axios.get(
      `https://api.bitget.com/api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1min&limit=60`
    );
    const newData = response.data;
    const formattedData = formatCandlestickData(newData.data);
    await submitDataToOtherAPI(formattedData, time);
  } catch (error) {
    console.error("Error fetching candlestick data:", error);
  }
};

const formatCandlestickData = (data: string[][]): CandlestickData[] => {
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
    const response = await axios.post(
      "https://api.7trade.pro/api/trading/post-price",
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
  fetchAndEmitCandlestickData();
  setInterval(fetchAndEmitCandlestickData, 1000);
};

io.on("connection", (socket: any) => {
  console.log("New connection:", socket.id);

  socket.on("push-notification", (message: string) => {
    console.log("Received Data:", message);
    io.emit("push-notification", message);
  });

  socket.on("message", (message: string) => {
    console.log("Received message:", message);
    io.emit("message", message);
  });

  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

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
