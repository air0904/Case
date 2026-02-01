<script setup>
defineProps({
  items: Array,
  unlocked: Boolean // 保留这个 prop，用于触发进场动画
})
</script>

<template>
  <main class="glass-card" :class="{ unlocked: unlocked }">
    <section class="gallery-grid">
      <article class="gallery-item" v-for="item in items" :key="item.title">
  <a :href="item.url" target="_blank" rel="noopener noreferrer" class="item-link">
    <div class="image-wrapper">
      <img :src="item.img" :alt="item.title">
    </div>
    <h3 class="item-title">{{ item.title }}</h3>
  </a>
</article>
    </section>
  </main>
</template>