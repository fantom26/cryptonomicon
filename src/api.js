const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${process.env.VUE_APP_API_KEY}`
);

const tickersHandlers = new Map();
const AGGREGATE_INDEX = "5";

const invalidSubsList = new Map();
const INVALID_SUB = "INVALID_SUB";

const pricesDependOnBTC = new Map();

const BTC_SYMBOL = "BTC";
const USD_SYMBOL = "USD";
let BTC_PRICE = 0;

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: fromCurrency,
    TOSYMBOL: toCurrency,
    MESSAGE: message,
    PARAMETER: nameSubs,
    PRICE: newPrice,
  } = JSON.parse(e.data);

  checkingInvalidSubs(message, nameSubs);

  if (type !== AGGREGATE_INDEX || newPrice === undefined) return;

  addPricesList(toCurrency, fromCurrency, newPrice);
  updateBtcPrice(fromCurrency, newPrice);
  recalculateTIckersPrice();
  setStatus(fromCurrency, true);
});

// InvalidSubs - currencies that don't have pairs to USD or BTC
function checkingInvalidSubs(message, nameSubs) {
  if (message === INVALID_SUB) {
    const fromCurrency = nameSubs.split("~").reverse().at(1);
    setStatus(fromCurrency, false);
  }
}

function addPricesList(toCurrency, currency, newPrice) {
  if (toCurrency === BTC_SYMBOL) {
    pricesDependOnBTC.set(currency, newPrice);
  }
}

function updateBtcPrice(fromCurrency, newPrice) {
  if (fromCurrency === BTC_SYMBOL) BTC_PRICE = newPrice;
}

function recalculateTIckersPrice() {
  if (BTC_PRICE === 0) subscribeToTickerOnWs(BTC_SYMBOL);

  if (!pricesDependOnBTC || pricesDependOnBTC.size === 0) return;

  [...pricesDependOnBTC.keys()].forEach((currency) => {
    const currencyPrice = pricesDependOnBTC.get(currency);
    const handlers = tickersHandlers.get(currency) ?? [];

    handlers.forEach((fn) => fn(currencyPrice * BTC_PRICE));
  });

  const btcHandlers = tickersHandlers.get(BTC_SYMBOL) ?? [];
  btcHandlers.forEach((fn) => fn(BTC_PRICE));
}

function setStatus(currency, status) {
  const handlers = invalidSubsList.get(currency) ?? [];

  handlers.forEach((fn) => {
    fn(status);
  });
}

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

function subscribeToTickerOnWs(ticker, unit = BTC_SYMBOL) {
  const toCurrency = ticker === BTC_SYMBOL ? USD_SYMBOL : unit;
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${toCurrency}`],
  });
}

function unsubscribeFromTickerOnWs(ticker) {
  if (ticker === BTC_SYMBOL) {
    return;
  }

  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${BTC_SYMBOL}`],
  });

  if (!tickersHandlers || tickersHandlers.size === 0) {
    sendToWebSocket({
      action: "SubRemove",
      subs: [`5~CCCAGG~${BTC_SYMBOL}~${USD_SYMBOL}`],
    });
  }
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};

export const subscribeToStatusTicker = (ticker, cb) => {
  const subscribers = invalidSubsList.get(ticker) || [];
  invalidSubsList.set(ticker, [...subscribers, cb]);
};

export const unsubscribeFromStatusTicker = (ticker) => {
  invalidSubsList.delete(ticker);
};

export const getCoinlist = () =>
  fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api_key=${process.env.VUE_APP_API_KEY}`
  ).then((result) => result.json());
