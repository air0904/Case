import { ref, watch } from 'vue'

const STORAGE_KEY = 'case-theme'

export const useTheme = () => {
  const isDark = ref(false)

  const applyTheme = (enabled) => {
    if (enabled) {
      document.body.setAttribute('data-theme', 'dark')
    } else {
      document.body.removeAttribute('data-theme')
    }
  }

  const initTheme = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      isDark.value = saved === 'dark'
    }
    applyTheme(isDark.value)
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  watch(isDark, (val) => {
    applyTheme(val)
    localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
  })

  return {
    isDark,
    initTheme,
    toggleTheme
  }
}
