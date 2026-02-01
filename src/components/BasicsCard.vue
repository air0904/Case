<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['open-knowledge'])

const searchQuery = ref('')
const isSearchFocused = ref(false)

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return props.items
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item => item.title.toLowerCase().includes(query))
})

const handleClick = (item, event) => {
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  emit('open-knowledge', { item, rect })
}
</script>

<template>
  <div class="library-container">
    
    <div class="section-header">
      <div class="header-left">
        <h2 class="section-title">Library</h2>
      </div>
      
      <div class="search-container" :class="{ 'focused': isSearchFocused }">
        <div class="search-input-wrapper">
          <span class="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input 
            v-model="searchQuery" 
            placeholder="Search..." 
            class="library-search-input"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
          />
          <button v-show="searchQuery" class="clear-btn" @click="searchQuery = ''">×</button>
        </div>
      </div>
    </div>

    <div class="ios-grid-wrapper">
      <div v-if="filteredItems.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No apps found.</p>
      </div>

      <transition-group name="app-pop" tag="div" class="ios-grid">
        <div 
          class="app-item" 
          v-for="item in filteredItems" 
          :key="item.title"
          @click="(e) => handleClick(item, e)" 
        >
          <div class="icon-container">
            <img :src="item.img" :alt="item.title">
          </div>
          <span class="app-title">{{ item.title }}</span>
        </div>
      </transition-group>

    </div>
  </div>
</template>

<style scoped>
/* ... (保留原有顶部样式，如 .library-container, .section-header 等) ... */
.library-container {
  width: 100%; height: 100%;
  padding: 30px 40px;
  display: flex; flex-direction: column;
}
.section-header {
  margin-bottom: 20px;
  display: flex; justify-content: space-between; align-items: center;
  gap: 20px; height: 60px; flex-shrink: 0;
}
.header-left { display: flex; align-items: center; }
.section-title {
  font-size: 2.2rem; font-weight: 800;
  background: linear-gradient(135deg, var(--text-main) 0%, var(--text-sec) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
.search-container { width: 260px; transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); }
.search-container.focused { width: 320px; }
.search-input-wrapper {
  position: relative; width: 100%; height: 50px;
  background: var(--glass-bg); backdrop-filter: blur(30px);
  border: 1px solid var(--glass-border); border-radius: 25px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.3s;
}
.search-container.focused .search-input-wrapper { background: var(--input-bg); border-color: #007aff; box-shadow: 0 8px 24px rgba(0, 122, 255, 0.15); }
.search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-sec); opacity: 0.6; pointer-events: none; display: flex; }
.library-search-input { width: 100%; height: 100%; background: transparent; border: none; outline: none; font-size: 1rem; color: var(--text-main); padding-left: 44px; padding-right: 36px; }
.clear-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.1); color: var(--text-sec); font-size: 14px; line-height: 1; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.clear-btn:hover { background: rgba(0,0,0,0.2); color: var(--text-main); }

/* --- iOS 网格核心样式 --- */
.ios-grid-wrapper {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 10px; margin: -10px;
  scrollbar-width: none;
}
.ios-grid-wrapper::-webkit-scrollbar { display: none; }

.ios-grid {
  display: grid;
  /* [需求1 修改点]：宽屏默认显示 6 列 */
  grid-template-columns: repeat(6, 1fr);
  row-gap: 32px; 
  column-gap: 12px; 
  padding-bottom: 60px;
  justify-items: center;
}

/* 单个 APP 项 */
.app-item {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  cursor: pointer;
  width: 100%;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.app-item:hover { transform: scale(1.08); z-index: 10; }

/* 图标容器 */
.icon-container {
  width: 90px; height: 90px; /* 如果6列太挤，可以适当减小这个尺寸，比如 80px */
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 22px; 
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  transition: box-shadow 0.3s ease;
}
.app-item:hover .icon-container {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  border-color: rgba(255, 255, 255, 0.4);
}
.icon-container img { width: 60%; height: 60%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }

.app-title {
  font-size: 1rem; font-weight: 500;
  color: var(--text-main); text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 100%; opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60%; color: var(--text-sec); margin-top: 60px; }
.empty-icon { font-size: 3rem; margin-bottom: 15px; opacity: 0.3; }
.app-pop-enter-active, .app-pop-leave-active { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.app-pop-enter-from, .app-pop-leave-to { opacity: 0; transform: scale(0.5); }

/* 移动端适配 */
@media (max-width: 768px) {
  .library-container { padding: 20px 20px; }
  .section-title { font-size: 1.8rem; }
  .search-container { width: 100%; } 
  .search-container.focused { width: 100%; }
  
  .ios-grid {
    /* [需求1 修改点]：窄屏/手机端强制改为 3 列 */
    grid-template-columns: repeat(3, 1fr);
    column-gap: 8px;
    row-gap: 24px;
  }
  
  .icon-container { width: 72px; height: 72px; border-radius: 18px; }
  .app-title { font-size: 0.85rem; }
}
</style>