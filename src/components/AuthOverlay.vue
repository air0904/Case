<script setup>
import { ref } from 'vue'
import api from '../services/api' // [新增]

const emit = defineEmits(['unlock'])

const password = ref('')
const isShaking = ref(false)
const isLoading = ref(false)

const handleConfirm = async () => {
  if (!password.value) return triggerShake()
  
  isLoading.value = true
  try {
    const data = await api.login(password.value) // [重构] 使用 api 模块
    
    // 登录成功，Token 已经在 login 接口响应中拿到
    localStorage.setItem('authToken', data.token)
    emit('unlock', 'admin')
  } catch (e) {
    console.error('登录失败', e)
    triggerShake()
  } finally {
    isLoading.value = false
  }
}

// ... (其他部分保持不变)
const handleGuest = () => {
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