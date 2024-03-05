const { Server } = require("socket.io");
const { createServer } = require("http");
import axios from "axios";
// const fetch = require("node-fetch"); // Import fetch for Node.js environment

const httpServer = createServer();
const io = new Server(httpServer);
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
    const response = await fetch(
      `https://api.bitget.com/api/v2/spot/market/candles?symbol=BTCUSDT&granularity=1min&startTime=${time}&limit=60`
    );
    const newData = await response.json();
    const formattedData = formatCandlestickData(newData.data);
    await submitDataToOtherAPI(formattedData,time);
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

const submitDataToOtherAPI = async (data:CandlestickData[],time:any) => {
  const postData = {
    candlestickData: data,
    currentTime: time
  };
  try {
    // Replace the URL with the endpoint of the other API and modify the submission logic as needed
    const response = await axios.post("https://justview.online/api/trading/post-price", postData);
    console.log(response.data)
    if (response.status==200) {
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

httpServer.listen(3009, () => {
  console.log("WebSocket server is listening on port - 3009");
  // Start fetching data once the server is running
  startFetchingData();
});
