<script setup>
import { ref, computed, watch } from 'vue'
import DOMPurify from 'dompurify'

const props = defineProps({
  cases: { type: Array, default: () => [] },
  isAdmin: Boolean
})

const emit = defineEmits(['create', 'view', 'delete'])

const searchQuery = ref('')
const debouncedQuery = ref('')
let debounceTimer = null
const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 }

// ... (computed 逻辑保持不变) ...
watch(searchQuery, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value
  }, 250)
})

const processedCases = computed(() => {
  if (!Array.isArray(props.cases)) return []
  let result = [...props.cases]
  if (debouncedQuery.value.trim()) {
    const query = debouncedQuery.value.toLowerCase()
    result = result.filter(item => 
      (item.title || '').toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query)
    )
  }
  return result.sort((a, b) => {
    const isAResolved = !!a.resolution
    const isBResolved = !!b.resolution
    if (isAResolved !== isBResolved) return isAResolved ? 1 : -1
    if (!isAResolved) {
      const pA = (a.priority || '').toLowerCase()
      const pB = (b.priority || '').toLowerCase()
      const weightA = priorityWeight[pA] || 0
      const weightB = priorityWeight[pB] || 0
      if (weightA !== weightB) return weightB - weightA
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })
})

const leftColumnCases = computed(() => processedCases.value.filter((_, i) => i % 2 === 0))
const rightColumnCases = computed(() => processedCases.value.filter((_, i) => i % 2 !== 0))

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

const getPriorityClass = (priority) => {
  const p = (priority || '').toLowerCase()
  if (p === 'high') return 'badge-high'; if (p === 'medium') return 'badge-medium'; return 'badge-low'
}

const truncate = (text, length = 60) => {
  if (!text) return ''; return text.length > length ? text.substring(0, length) + '...' : text
}

const handleCardClick = (item, event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  emit('view', { item, rect })
}

// [新增] 实时高亮函数
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const escapeHtml = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const highlightText = (text) => {
  if (!text) return ''
  if (!debouncedQuery.value.trim()) return escapeHtml(text)
  const keyword = escapeRegExp(debouncedQuery.value.trim())
  const reg = new RegExp(`(${keyword})`, 'gi')
  const safeText = escapeHtml(text)
  const highlighted = safeText.replace(reg, '<span class="highlight-text">$1</span>')
  return DOMPurify.sanitize(highlighted, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class']
  })
}
</script>

<template>
  <div class="cases-container">
    <div class="section-header">
      <div class="header-left">
        <h2 class="section-title">Cases</h2>
        <div class="header-decoration"></div>
      </div>
      <div class="search-box">
        <span class="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </span>
        <input 
          v-model="searchQuery" 
          :placeholder="`Search ${cases.length} cases...`" 
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">×</button>
      </div>
    </div>

    <div class="cases-scroll-area">
      <div v-if="processedCases.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No matches found.</p>
      </div>

      <div v-else class="waterfall-container">
        <div class="waterfall-column">
          <article 
            v-for="item in leftColumnCases" 
            :key="item.id" 
            class="case-card glass-panel"
            @click="(e) => handleCardClick(item, e)"
          >
            <div class="card-top">
              <div class="category-badge"><span class="dot"></span><span v-html="highlightText(item.category)"></span></div>
              <div class="priority-badge" :class="getPriorityClass(item.priority)">{{ item.priority }}</div>
            </div>
            <div class="card-main">
              <h3 class="card-title" v-html="highlightText(item.title)"></h3>
              <p class="card-desc" v-html="highlightText(truncate(item.description))"></p>
            </div>
            <div class="card-footer">
              <span class="date-text">{{ formatDate(item.created_at) }}</span>
              <div class="status-indicator">
                <span class="status-dot" :class="{ 'resolved': item.resolution }"></span>
                {{ item.resolution ? 'Resolved' : 'Open' }}
              </div>
            </div>
          </article>
        </div>

        <div class="waterfall-column">
          <article 
            v-for="item in rightColumnCases" 
            :key="item.id" 
            class="case-card glass-panel"
            @click="(e) => handleCardClick(item, e)"
          >
             <div class="card-top">
              <div class="category-badge"><span class="dot"></span><span v-html="highlightText(item.category)"></span></div>
              <div class="priority-badge" :class="getPriorityClass(item.priority)">{{ item.priority }}</div>
            </div>
            <div class="card-main">
              <h3 class="card-title" v-html="highlightText(item.title)"></h3>
              <p class="card-desc" v-html="highlightText(truncate(item.description))"></p>
            </div>
            <div class="card-footer">
              <span class="date-text">{{ formatDate(item.created_at) }}</span>
              <div class="status-indicator">
                <span class="status-dot" :class="{ 'resolved': item.resolution }"></span>
                {{ item.resolution ? 'Resolved' : 'Open' }}
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保持原有样式不变 */
.cases-container { width: 100%; height: 100%; padding: 20px 40px; display: flex; flex-direction: column; }
.section-header { margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.header-left { display: flex; align-items: center; gap: 15px; flex: 1; }
.section-title { font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, var(--text-main) 0%, var(--text-sec) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; }
.header-decoration { width: 60px; height: 2px; background: linear-gradient(90deg, var(--glass-border), transparent); opacity: 0.5; }
.search-box { position: relative; width: 240px; height: 40px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.search-box:focus-within { width: 300px; }
.search-input { width: 100%; height: 100%; background: rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 0 35px 0 40px; color: var(--text-main); font-size: 0.9rem; outline: none; transition: all 0.3s; }
.search-input:focus { background: rgba(0, 0, 0, 0.2); border-color: rgba(255, 255, 255, 0.3); box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05); }
.search-input::placeholder { color: var(--text-sec); opacity: 0.7; }
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-sec); opacity: 0.6; display: flex; pointer-events: none; }
.clear-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--text-sec); font-size: 1.2rem; cursor: pointer; padding: 0 4px; line-height: 1; }
.clear-btn:hover { color: var(--text-main); }
.cases-scroll-area { flex: 1; overflow-y: auto; padding: 10px; margin: -10px; scrollbar-width: none; }
.cases-scroll-area::-webkit-scrollbar { display: none; }
.waterfall-container { display: flex; gap: 24px; padding-bottom: 80px; align-items: flex-start; }
.waterfall-column { flex: 1; display: flex; flex-direction: column; gap: 24px; }
.case-card { position: relative; background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%); border: 1px solid rgba(255, 255, 255, 0.12); border-top-color: rgba(255, 255, 255, 0.2); border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 16px; cursor: pointer; transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03); height: auto; }
.case-card:hover { transform: translateY(-4px); background: linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%); border-color: rgba(255, 255, 255, 0.3); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.08); }
.card-top { display: flex; justify-content: space-between; align-items: center; }
.category-badge { font-size: 0.85rem; font-weight: 600; color: var(--text-sec); display: flex; align-items: center; gap: 6px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-sec); opacity: 0.5; }
.priority-badge { padding: 4px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-high { background: rgba(255, 59, 48, 0.15); color: #ff3b30; box-shadow: 0 0 10px rgba(255, 59, 48, 0.2); }
.badge-medium { background: rgba(255, 149, 0, 0.15); color: #ff9500; }
.badge-low { background: rgba(52, 199, 89, 0.15); color: #34c759; }
.card-main { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.card-title { font-size: 1.25rem; font-weight: 700; color: var(--text-main); line-height: 1.3; }
.card-desc { font-size: 0.95rem; color: var(--text-sec); line-height: 1.5; opacity: 0.8; }
.card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.date-text { font-size: 0.8rem; color: var(--text-sec); font-family: 'SF Mono', monospace; opacity: 0.6; }
.status-indicator { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; color: var(--text-main); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #007aff; box-shadow: 0 0 8px rgba(0, 122, 255, 0.4); }
.status-dot.resolved { background: #34c759; box-shadow: 0 0 8px rgba(52, 199, 89, 0.4); }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60%; color: var(--text-sec); text-align: center; margin-top: 60px; }
.empty-icon { font-size: 4rem; margin-bottom: 20px; opacity: 0.3; }
@media (max-width: 768px) {
  .cases-container { padding: 20px; }
  .section-title { font-size: 1.5rem; }
  .section-header { flex-direction: column; align-items: flex-start; gap: 15px; }
  .search-box { width: 100%; }
  .search-box:focus-within { width: 100%; }
  .waterfall-container { flex-direction: column; gap: 16px; }
  .waterfall-column { width: 100%; gap: 16px; }
}
</style>
