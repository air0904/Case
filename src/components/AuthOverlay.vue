<script setup>
import { ref } from 'vue'

const emit = defineEmits(['unlock'])

const password = ref('')
const isShaking = ref(false)
const isLoading = ref(false) // 新增加载状态

const handleConfirm = async () => {
  if (!password.value) return triggerShake()
  
  isLoading.value = true
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    })

    if (res.ok) {
      const data = await res.json()
      // 登录成功，把令牌存进浏览器
      localStorage.setItem('authToken', data.token)
      emit('unlock', 'admin')
    } else {
      triggerShake()
    }
  } catch (e) {
    console.error(e)
    triggerShake()
  } finally {
    isLoading.value = false
  }
}

const handleGuest = () => {
  // Guest 不需要令牌，或者清除旧令牌
  localStorage.removeItem('authToken')
  emit('unlock', 'guest')
}

const triggerShake = () => {
  isShaking.value = true
  password.value = ''
  setTimeout(() => { isShaking.value = false }, 500)
}
</script>

<template>
  <div class="auth-overlay">
    <div class="auth-card" :class="{ shake: isShaking }">
      <div class="auth-title">Hello</div>
      
      <div class="auth-identity">
        <div class="avatar"><img src="/img/head.JPG" alt="Me"></div>
        <div class="name">Stephen</div>
      </div>
      
      <input 
        type="password" 
        v-model="password"
        class="auth-input" 
        :placeholder="isLoading ? 'Verifying...' : 'Enter Key'" 
        @keyup.enter="handleConfirm"
        :disabled="isLoading"
      />
      
      <div class="auth-actions">
        <button class="btn-link" @click="handleGuest">I'm not Stephen</button>
        <button class="btn-confirm" @click="handleConfirm" :disabled="isLoading">
          {{ isLoading ? '...' : 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ... 保持原样 ... */
.avatar img { max-width: 70px !important; max-height: 70px !important; border-radius: 50%; }
</style>