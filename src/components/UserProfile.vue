<script setup>
// 接收父组件传来的 props
defineProps({
  mode: String // 'locked', 'admin', 'guest'
})
</script>

<template>
  <div class="user-profile" :class="{ 'guest-mode': mode === 'guest' }">
    <div class="avatar" v-if="mode !== 'guest'">
      <img src="/img/head.JPG" alt="User">
    </div>
    
    <div class="username">
      {{ mode === 'guest' ? 'Guest' : 'Stephen' }}
    </div>
    
    <div v-if="mode === 'admin'" class="status-badge" style="color: #007AFF">Admin</div>
    <div v-if="mode === 'locked'" class="status-badge">Locked</div>
  </div>
</template>