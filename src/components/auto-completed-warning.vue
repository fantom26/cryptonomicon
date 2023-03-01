<template>
  <div v-if="status" class="text-sm text-red-600 mt-1">
    This ticker already added
  </div>
</template>

<script>
export default {
  props: {
    status: Object,
  },
};
</script>
