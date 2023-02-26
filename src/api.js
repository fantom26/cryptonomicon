const API_KEY =
  "2bc6306864ca02a96fe2769ee26b09ec3e62daa99b0dbd77e65d52587d933dbc";

const tickersInfo = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATE_INDEX = "5";

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: fromCurrency,
    // TOSYMBOL: toCurrency,
    MESSAGE: message,
    PARAMETER: parameter,
    PRICE: newPrice,
  } = JSON.parse(e.data);

  console.log(tickersInfo);

  if (message === "INVALID_SUB") {
    const [toCurrency, fromCurrency] = parameter.split("~").reverse();

    if (toCurrency !== "BTC") {
      const [firstCb] = tickersInfo.get(fromCurrency).handlers;
      subscribeToTicker(fromCurrency, firstCb, false);
    }
  }

  if (fromCurrency === "BTC") {
    const tickersDependOnBTC = Object.fromEntries(
      Object.entries(tickersInfo).filter((ticker) => !ticker[1].toBTC) // [1] = value in [key, value]
    );

    for (const tickerName in tickersDependOnBTC) {
      const currencyInfo = tickersInfo.get(tickerName) ?? [];
      currencyInfo.price *= newPrice; // newPrice = BTC price
      currencyInfo.handlers.forEach((fn) => fn(currencyInfo.price));
    }
  }

  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }

  const currencyInfo = tickersInfo.get(fromCurrency) ?? [];
  currencyInfo.price = newPrice;
  currencyInfo.handlers.forEach((fn) => fn(newPrice));
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
  const subscribers = tickersInfo.get(ticker)?.handlers || [];
  tickersInfo.set(ticker, {
    price: null,
    toBTC: !toUSD,
    handlers: [...subscribers, cb],
  });
  subscribeToTickerOnWs(ticker, toUSD);
};

export const unsubscribeFromTicker = (ticker, toUSD = true) => {
  tickersInfo.delete(ticker);
  unsubscribeFromTickerOnWs(ticker, toUSD);
};
