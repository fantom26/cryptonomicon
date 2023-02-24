const API_KEY =
  "2bc6306864ca02a96fe2769ee26b09ec3e62daa99b0dbd77e65d52587d933dbc";

const tickersHandlers = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATE_INDEX = "5";

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    MESSAGE: message,
    PARAMETER: parameter,
    PRICE: newPrice,
  } = JSON.parse(e.data);

  if (message === "INVALID_SUB") {
    const [toCurrency, fromCurrency] = parameter.split("~").reverse();
    console.log("toCurrency", toCurrency);
    console.log("fromCurrency", fromCurrency);

    if (toCurrency !== "BTC") {
      const [firstCb] = tickersHandlers.get(fromCurrency);
      subscribeToTicker(fromCurrency, firstCb, false);
    }
  }

  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }

  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach((fn) => fn(newPrice));
});

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker, toUSD) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${toUSD ? "USD" : "BTC"}`],
  });
}

function unsubscribeFromTickerOnWs(ticker, toUSD) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${toUSD ? "USD" : "BTC"}`],
  });
}

export const subscribeToTicker = (ticker, cb, toUSD = true) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker, toUSD);
};

export const unsubscribeFromTicker = (ticker, toUSD = true) => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker, toUSD);
};
