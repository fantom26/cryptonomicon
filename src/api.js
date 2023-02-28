const API_KEY =
  "2bc6306864ca02a96fe2769ee26b09ec3e62daa99b0dbd77e65d52587d933dbc";

export const tickersInfo = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATE_INDEX = "5";
const INVALID_SUB = "INVALID_SUB";
const BTC_SYMBOL = "BTC";
const USD_SYMBOL = "USD";

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: fromCurrency,
    TOSYMBOL: toCurrency,
    MESSAGE: message,
    PARAMETER: parameter,
    PRICE: newPrice,
  } = JSON.parse(e.data);

  // if "fromCurrency" doesn't have the pair to USD, I try to subscibe the "fromCurrency" to BTC
  if (message === INVALID_SUB) {
    const [toCurrency, fromCurrency] = parameter.split("~").reverse();

    if (toCurrency !== BTC_SYMBOL) {
      const [firstCb] = tickersInfo.get(fromCurrency).handlers;
      subscribeToTicker(fromCurrency, firstCb, false);
    }
  }

  // if fromCurrency = BTC, I change all prices thad depend on BTC value
  if (fromCurrency === BTC_SYMBOL && newPrice) {
    const tickersDependOnBTC = Object.fromEntries(
      Array.from(tickersInfo.entries()).filter((ticker) => ticker[1].toBTC)
    );

    for (const tickerName in tickersDependOnBTC) {
      const currencyInfo = tickersInfo.get(tickerName) ?? [];
      currencyInfo.priceToUSD = currencyInfo.priceToBTC * newPrice; // newPrice = BTC price
      currencyInfo.handlers.forEach((fn) =>
        fn(toCurrency === BTC_SYMBOL, currencyInfo.priceToUSD)
      );
    }

    return;
  }

  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }

  const currencyInfo = tickersInfo.get(fromCurrency) ?? [];

  if (toCurrency === USD_SYMBOL) {
    currencyInfo.priceToUSD = newPrice;
  } else {
    currencyInfo.priceToBTC = newPrice;

    if (currencyInfo.toBTC && tickersInfo.has(BTC_SYMBOL)) {
      currencyInfo.priceToUSD =
        currencyInfo.priceToBTC * tickersInfo.get(BTC_SYMBOL).priceToUSD;
    }
  }
  currencyInfo.handlers.forEach((fn) =>
    fn(toCurrency === BTC_SYMBOL, newPrice)
  );
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
    subs: [`5~CCCAGG~${ticker}~${toUSD ? USD_SYMBOL : BTC_SYMBOL}`],
  });
}

function unsubscribeFromTickerOnWs(ticker, toUSD) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${toUSD ? USD_SYMBOL : BTC_SYMBOL}`],
  });
}

export const subscribeToTicker = (ticker, cb, toUSD = true) => {
  const subscribers = tickersInfo.get(ticker)?.handlers || [];

  const tickerInfo = {
    priceToUSD: null,
    priceToBTC: null,
    toBTC: !toUSD,
    handlers: [...subscribers, cb],
  };

  tickersInfo.set(ticker, tickerInfo);
  subscribeToTickerOnWs(ticker, toUSD);
};

export const unsubscribeFromTicker = (ticker, toUSD = true) => {
  tickersInfo.delete(ticker);
  unsubscribeFromTickerOnWs(ticker, toUSD);
};

export const getCoinlist = () =>
  fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api_key=${API_KEY}`
  ).then((result) => result.json());
