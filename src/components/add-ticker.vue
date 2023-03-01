<template>
  <div>
    <div class="max-w-xs">
      <label for="wallet" class="block text-sm font-medium text-gray-700"
        >Ticker</label
      >
      <div class="mt-1 relative rounded-md shadow-md">
        <input
          v-model="ticker"
          type="text"
          @keydown.enter="add"
          name="wallet"
          id="wallet"
          class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
          placeholder="DOGE"
        />
      </div>
      <auto-completed-list
        @select-ticker="selectFromAutoComplete"
        :ticker="ticker"
        :coinlist="coinlist"
      />
      <auto-completed-warning :status="tickersContainNewTicker" />
    </div>
    <add-button @click="add" type="button" class="my-4" />
  </div>
</template>

<script>
import AddButton from "./add-button.vue";
import AutoCompletedList from "./auto-completed-list.vue";
import AutoCompletedWarning from "./auto-completed-warning.vue";

export default {
  name: "Add-ticker",

  components: {
    AddButton,
    AutoCompletedList,
    AutoCompletedWarning,
  },

  props: {
    coinlist: Object,
    tickers: Array,
  },

  data() {
    return {
      ticker: "",
    };
  },

  methods: {
    add() {
      if (this.tickersContainNewTicker) return;

      this.$emit("add-ticker", this.ticker);
      this.ticker = "";
    },

    selectFromAutoComplete(symbol) {
      this.ticker = symbol;
      this.add();
    },
  },

  computed: {
    tickersContainNewTicker() {
      return this.tickers.find(
        (ticker) => ticker.name.toLowerCase() === this.ticker.toLowerCase()
      );
    },
  },
};
</script>
