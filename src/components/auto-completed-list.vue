<template>
  <div
    v-if="autocompletedList.length"
    class="flex bg-white shadow-md p-1 rounded-md flex-wrap"
  >
    <span
      v-for="(coin, idx) in autocompletedList"
      :key="coin?.Id || idx"
      @click="selectFromAutoComplete(coin.Symbol)"
      class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
    >
      {{ coin.Symbol }}
    </span>
  </div>
</template>

<script>
export default {
  name: "Auto-completed-list",

  props: {
    ticker: String,
    coinlist: Object,
  },

  methods: {
    selectFromAutoComplete(symbol) {
      this.$emit("select-ticker", symbol);
    },
  },

  computed: {
    filteredCoinList() {
      if (!this.ticker) return [];

      return Object.values(this.coinlist).filter(
        (coin) =>
          coin.FullName.toLowerCase().match(this.ticker.toLowerCase()) ||
          coin.Symbol.toLowerCase().match(this.ticker.toLowerCase())
      );
    },

    autocompletedList() {
      const [first, second, third, fourth] = this.filteredCoinList;

      return [first, second, third, fourth].filter((coin) => coin);
    },
  },
};
</script>
