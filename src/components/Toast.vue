<script setup>
import { toastState } from '../utils/toast'
</script>

<template>
  <transition name="toast-slide">
    <div v-if="toastState.visible" class="toast-container" :class="toastState.type">
      <div class="toast-icon">
        <span v-if="toastState.type === 'success'">✓</span>
        <span v-else-if="toastState.type === 'error'">✕</span>
        <span v-else>ℹ</span>
      </div>
      <span class="toast-message">{{ toastState.message }}</span>
    </div>
  </transition>
</template>

<style scoped>
.toast-container {
  position: fixed; top: 40px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 12px;
  padding: 12px 24px; border-radius: 50px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  z-index: 11000; /* 确保比 auth-overlay 和 modal 都高 */
  border: 1px solid rgba(255,255,255,0.6);
  font-weight: 600; font-size: 0.95rem; pointer-events: none;
}

/* 颜色变体 */
.toast-container.success { color: #1d1d1f; }
.toast-container.success .toast-icon { 
  background: #34c759; color: white; width: 24px; height: 24px; 
  border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;
}

.toast-container.error { color: #ff3b30; }
.toast-container.error .toast-icon {
  background: #ff3b30; color: white; width: 24px; height: 24px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;
}

/* 动画 */
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translate(-50%, -20px) scale(0.9); }
</style>