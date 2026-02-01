<script setup>
import { computed } from 'vue'

const props = defineProps({
  isDark: Boolean
})

const emit = defineEmits(['toggle'])
</script>

<template>
  <button class="theme-toggle" @click="$emit('toggle')" :title="isDark ? 'Switch to Light' : 'Switch to Dark'">
    <transition name="rotate" mode="out-in">
      <span v-if="isDark" key="moon" class="icon">🌙</span>
      <span v-else key="sun" class="icon">☀️</span>
    </transition>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.theme-toggle:hover {
  background: var(--item-hover);
  transform: scale(1.1);
}

.icon {
  font-size: 1.2rem;
  line-height: 1;
}

/* 图标切换动画 */
.rotate-enter-active,
.rotate-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.rotate-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}

.rotate-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>