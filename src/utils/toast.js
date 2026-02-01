// src/utils/toast.js
import { reactive } from 'vue'

export const toastState = reactive({
  visible: false,
  message: '',
  type: 'success' // success | error | info
})

let timer = null

export const showToast = (message, type = 'success') => {
  toastState.message = message
  toastState.type = type
  toastState.visible = true
  
  if (timer) clearTimeout(timer)
  
  // 3秒后自动消失
  timer = setTimeout(() => {
    toastState.visible = false
  }, 3000)
}