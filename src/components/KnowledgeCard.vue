<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import api from '../services/api' // [新增] 引入 API 模块

const props = defineProps({
  visible: Boolean,
  data: Object, 
  allItems: { type: Array, default: () => [] },
  isAdmin: Boolean,
  originRect: Object
})

const emit = defineEmits(['close', 'switch'])

// --- 状态管理 ---
const notesCache = ref({}) 
const isAdding = ref(false)
const newContent = ref('')
const editingNoteId = ref(null)
const editingContent = ref('')
const isModifyMode = ref(false) 
const searchQuery = ref('')
const isSearching = ref(false)
const highlightedNoteId = ref(null)
const savedSearchTerm = ref('')

const startX = ref(0)
const startY = ref(0)
const isDragging = ref(false)
const ignoreClick = ref(false)

const cardWidth = ref(900)
const cardGap = ref(40)
const isAnimating = ref(false)
const contentOpacity = ref(1)

// --- 计算属性 ---
const currentIndex = computed(() => {
  if (!props.allItems || !props.data) return 0
  return props.allItems.findIndex(item => item.title === props.data.title)
})

const totalNotesCount = computed(() => {
  let count = 0
  for (const key in notesCache.value) {
    if (notesCache.value[key]) {
      count += notesCache.value[key].length
    }
  }
  return count
})

const trackStyle = computed(() => {
  const offset = `calc(50vw - ${cardWidth.value / 2}px - ${currentIndex.value * (cardWidth.value + cardGap.value)}px)`
  return { transform: `translateX(${offset})` }
})

const filteredResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase()
  const results = []
  for (const [title, notes] of Object.entries(notesCache.value)) {
    notes.forEach(note => {
      if (note.content.toLowerCase().includes(query)) {
        const item = props.allItems.find(i => i.title === title)
        if (item) results.push({ id: note.id, title, content: note.content, item })
      }
    })
  }
  return results
})

const handleCardClick = (item) => {
  if (ignoreClick.value || item.title === props.data?.title) return
  emit('switch', item)
}

// --- FLIP 动画 ---
const performEnterAnimation = async () => {
  if (!props.originRect) return
  isAnimating.value = true
  contentOpacity.value = 0
  await nextTick()
  const activeCard = document.querySelector('.card-wrapper.active .knowledge-card')
  if (!activeCard) return
  const targetRect = activeCard.getBoundingClientRect()
  const scaleX = props.originRect.width / targetRect.width
  const scaleY = props.originRect.height / targetRect.height
  const translateX = props.originRect.left - targetRect.left + (props.originRect.width - targetRect.width) / 2
  const translateY = props.originRect.top - targetRect.top + (props.originRect.height - targetRect.height) / 2
  const wrapper = activeCard.parentElement
  wrapper.style.transition = 'none'
  wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`
  activeCard.style.borderRadius = `${24 / Math.min(scaleX, scaleY)}px`
  wrapper.offsetHeight 
  requestAnimationFrame(() => {
    wrapper.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
    wrapper.style.transform = ''
    activeCard.style.transition = 'border-radius 0.5s'
    activeCard.style.borderRadius = '24px'
    setTimeout(() => { isAnimating.value = false; contentOpacity.value = 1 }, 400)
  })
}

// --- [重构] 数据加载 ---
const loadAllNotes = async () => {
  try {
    const allNotes = await api.getNotes()
    
    // 将扁平数组按 category (title) 分组
    const newCache = {}
    props.allItems.forEach(item => { newCache[item.title] = [] }) // 初始化
    
    allNotes.forEach(note => {
      if (newCache[note.category]) {
        newCache[note.category].push(note)
      }
    })
    notesCache.value = newCache
  } catch (e) {
    console.error('加载笔记失败', e)
  }
}

const getCurrentNotes = (title) => notesCache.value[title] || []
const updateLayout = () => { const w = window.innerWidth; if (w < 768) { cardWidth.value = w * 0.92; cardGap.value = 16 } else { cardWidth.value = 900; cardGap.value = 40 } }
onMounted(() => { updateLayout(); window.addEventListener('resize', updateLayout) })
onUnmounted(() => { window.removeEventListener('resize', updateLayout) })

watch(() => props.visible, (val) => {
  if (val) {
    isAdding.value = false; newContent.value = ''; editingNoteId.value = null; isModifyMode.value = false; searchQuery.value = ''; isSearching.value = false; highlightedNoteId.value = null;
    savedSearchTerm.value = '' 
    loadAllNotes(); // 打开时加载数据
    updateLayout(); performEnterAnimation()
  } else { contentOpacity.value = 1 }
})

// 高亮渲染函数
const renderContent = (content) => {
  if (!content) return ''
  if (!savedSearchTerm.value.trim()) return content
  const reg = new RegExp(`(${savedSearchTerm.value})`, 'gi')
  return content.replace(reg, '<span class="highlight-text">$1</span>')
}

// --- [重构] CRUD 操作 ---
const activeTitle = computed(() => props.data?.title)
const startAdd = () => { if (!activeTitle.value) return; cancelEdit(); isAdding.value = true; nextTick(() => { scrollToBottom(); const t = document.querySelector('#new-note-textarea'); if(t) t.focus(); }) }

const confirmInput = async () => { 
  if (!newContent.value.trim() || !activeTitle.value) return
  
  const payload = { category: activeTitle.value, content: newContent.value }
  
  try {
    const savedNote = await api.createNote(payload) // 使用 api 模块

    // UI 更新
    if (!notesCache.value[activeTitle.value]) notesCache.value[activeTitle.value] = []
    notesCache.value[activeTitle.value].push(savedNote)
    
    newContent.value = ''
    isAdding.value = false
    nextTick(scrollToBottom)
  } catch (e) {
    console.error('添加笔记失败', e)
  }
}

const startEdit = (note) => { 
  if (!props.isAdmin) return; // 权限校验
  if (props.data.title !== activeTitle.value) return; 
  if (isAdding.value) isAdding.value = false; 
  editingNoteId.value = note.id; 
  editingContent.value = note.content; 
  nextTick(() => { const t = document.querySelector(`#edit-textarea-${note.id}`); if(t){ autoResize({target:t}); t.focus(); } }) 
}

const updateNote = async () => { 
  if (!editingContent.value.trim() || !activeTitle.value) return
  
  const list = notesCache.value[activeTitle.value]
  const index = list.findIndex(n => n.id === editingNoteId.value)
  if (index !== -1) list[index].content = editingContent.value
  
  try {
    await api.updateNote(editingNoteId.value, { content: editingContent.value }) // 使用 api 模块
  } catch (e) {
    console.error('更新笔记失败', e)
  }
  cancelEdit() 
}

const deleteNote = async (id) => { 
  if (!activeTitle.value) return
  notesCache.value[activeTitle.value] = notesCache.value[activeTitle.value].filter(n => n.id !== id)
  
  try {
    await api.deleteNote(id) // 使用 api 模块
  } catch (e) {
    console.error('删除笔记失败', e)
  }
}

const cancelEdit = () => { editingNoteId.value = null; editingContent.value = '' }
const toggleModify = () => { isModifyMode.value = !isModifyMode.value; cancelEdit(); isAdding.value = false }
const handleDownload = () => { if (!activeTitle.value) return; let text = `# ${activeTitle.value}\n\n`; const list = notesCache.value[activeTitle.value] || []; list.forEach((note, i) => { text += `### Note ${i+1}\n${note.content}\n\n` }); const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${activeTitle.value}_Notes.md`; link.click(); }
const enterSearchMode = () => { isSearching.value = true }; const exitSearchMode = () => { isSearching.value = false; searchQuery.value = '' }
const handleSearchResultClick = (result) => { 
  savedSearchTerm.value = searchQuery.value 
  emit('switch', result.item); exitSearchMode(); highlightedNoteId.value = result.id; nextTick(() => { setTimeout(() => { const noteElement = document.getElementById(`note-${result.id}`); if (noteElement) noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 300); setTimeout(() => { highlightedNoteId.value = null }, 2000) }) 
}
const scrollToBottom = () => { const ac = document.querySelector('.card-wrapper.active .notes-scroll-area'); if(ac) ac.scrollTop = ac.scrollHeight; }
const autoResize = (e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }
const formatIndex = (i) => (i + 1).toString().padStart(2, '0')

// --- 手势与点击处理 (保持不变) ---
const onTouchStart = (e) => {
  if (e.target.tagName.toLowerCase() === 'textarea' || e.target.closest('button') || e.target.closest('.global-search-container')) return
  if (e.changedTouches) { startX.value = e.changedTouches[0].clientX; startY.value = e.changedTouches[0].clientY } else { startX.value = e.clientX; startY.value = e.clientY }
  isDragging.value = true
}
const onTouchEnd = (e) => {
  if (!isDragging.value) return; isDragging.value = false
  const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
  const endY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY
  const diffX = endX - startX.value
  const diffY = endY - startY.value
  
  if (!isSearching.value) {
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) { 
      if (diffX < 0) switchItem('next'); else switchItem('prev'); 
      ignoreClick.value = true; 
      setTimeout(() => { ignoreClick.value = false }, 100); 
      return 
    }
    if (diffY > 100 && Math.abs(diffY) > Math.abs(diffX)) { 
      if (!isModifyMode.value && !isAdding.value && editingNoteId.value === null) { emit('close'); return } 
    }
  }
  if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
    const isClickOnCard = e.target.closest('.knowledge-card')
    const isClickOnSearch = e.target.closest('.global-search-container')
    const isClickOnResults = e.target.closest('.search-results-list')
    if (!isClickOnCard && !isClickOnSearch && !isClickOnResults) { 
      if (isSearching.value) { exitSearchMode() } 
      else { if (!isModifyMode.value && !isAdding.value && editingNoteId.value === null) { emit('close') } } 
    }
  }
}
const switchItem = (direction) => { if (!props.allItems.length) return; let nextIdx; if (direction === 'next') nextIdx = (currentIndex.value + 1) % props.allItems.length; else nextIdx = (currentIndex.value - 1 + props.allItems.length) % props.allItems.length; emit('switch', props.allItems[nextIdx]) }
</script>

<template>
  <div 
    class="knowledge-overlay" 
    :class="{ visible: visible }"
    @mousedown="onTouchStart" @mouseup="onTouchEnd"
    @touchstart="onTouchStart" @touchend="onTouchEnd"
  >
    <div class="global-search-container" :class="{ 'search-active': isSearching }" :style="{ opacity: contentOpacity, transition: 'opacity 0.3s' }" @mousedown.stop @touchstart.stop>
      <div class="search-input-wrapper">
        <span class="search-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
        <input v-model="searchQuery" class="global-search-input" :placeholder="`Search ${totalNotesCount} notes...`" @focus="enterSearchMode" />
        <button v-if="isSearching" class="close-search-btn" @click="exitSearchMode">{{ searchQuery ? 'Clear' : 'Cancel' }}</button>
      </div>
    </div>
    
    <transition name="fade-up">
      <div class="search-results-layer" v-if="isSearching" @mousedown.stop @touchstart.stop>
        <div class="search-results-list" v-if="searchQuery">
          <div v-if="filteredResults.length > 0">
            <div class="search-result-item" v-for="res in filteredResults" :key="res.id" @click="handleSearchResultClick(res)">
              <div class="res-header"><span class="res-badge">{{ res.title }}</span><span class="res-arrow">→</span></div>
              <div class="res-content">{{ res.content }}</div>
            </div>
          </div>
          <div v-else class="no-results"><span class="no-res-icon">🔍</span><p>No matches found for "{{ searchQuery }}"</p></div>
        </div>
        <div v-else class="search-placeholder"><p>Type to search across all your notes</p></div>
      </div>
    </transition>

    <div class="carousel-track" :style="[trackStyle, { gap: cardGap + 'px' }]" :class="{ 'track-hidden': isSearching }">
      <div 
        v-for="(item, index) in allItems" 
        :key="item.title"
        class="card-wrapper"
        :style="{ width: cardWidth + 'px' }" 
        :class="{ active: index === currentIndex }"
      >
        <div class="glass-card knowledge-card" @click.stop="handleCardClick(item)">
          <div class="card-content-wrapper" :style="{ opacity: contentOpacity, transition: 'opacity 0.4s' }">
            <div class="card-header">
              <div class="header-left">
                <h1 class="card-title">{{ item.title }}</h1>
                <div class="card-icon hover-jelly"><img :src="item.img" :alt="item.title"></div>
              </div>
              <div class="header-right" v-if="isAdmin && index === currentIndex">
                <button class="fab-add-note" @click="startAdd" :disabled="isAdding || editingNoteId !== null">+</button>
              </div>
            </div>
            <div class="card-body-container">
              <div class="notes-scroll-area">
                <div class="notes-list">
                  <template v-for="(note, nIndex) in getCurrentNotes(item.title)" :key="note.id">
                    <div class="note-item-wrapper">
                      <div class="note-index">{{ formatIndex(nIndex) }}</div>
                      <div class="note-content-area">
                        <div v-if="index === currentIndex && editingNoteId === note.id" class="note-card input-card blue-border-active">
                          <button class="btn-cancel-x" @click="cancelEdit">×</button>
                          <textarea :id="`edit-textarea-${note.id}`" class="input-card-textarea" v-model="editingContent" @input="autoResize"></textarea>
                          <div class="input-actions"><button class="btn-input btn-clear" @click="editingContent = ''">Clear</button><button class="btn-input btn-confirm" @click="updateNote">Update</button></div>
                        </div>
                        <div v-else :id="'note-' + note.id" class="note-card display-card blue-outline" :class="{ 'shake-anim': isModifyMode, 'highlight-flash': highlightedNoteId === note.id }" @dblclick="index === currentIndex && startEdit(note)">
                          <div class="note-content" v-html="renderContent(note.content)"></div>
                          <button v-if="isModifyMode && isAdmin" class="btn-trash" @click.stop="deleteNote(note.id)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        </div>
                      </div>
                    </div>
                  </template>
                  <div class="note-item-wrapper" v-if="index === currentIndex && isAdding">
                    <div class="note-index new-index">+</div>
                    <div class="note-card input-card blue-border-active">
                      <button class="btn-cancel-x" @click="isAdding = false">×</button>
                      <textarea id="new-note-textarea" class="input-card-textarea" v-model="newContent" placeholder="New note..." @input="autoResize"></textarea>
                      <div class="input-actions"><button class="btn-input btn-clear" @click="newContent = ''">Clear</button><button class="btn-input btn-confirm" @click="confirmInput">Confirm</button></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="left-actions"></div>
              <div class="right-actions">
                <button class="btn-primary-soft" @click="handleDownload">Download</button>
                <button v-if="isAdmin" class="btn-primary" :class="{ 'btn-warning': isModifyMode }" @click="toggleModify">{{ isModifyMode ? 'Done' : 'Modify' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保持原有所有样式，无需修改 */
.card-content-wrapper { display: flex; flex-direction: column; height: 100%; width: 100%; }
.knowledge-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--modal-overlay); backdrop-filter: blur(20px); z-index: 2000; opacity: 0; pointer-events: none; transition: opacity 0.4s ease; overflow: hidden; }
.knowledge-overlay.visible { opacity: 1; pointer-events: auto; }
.carousel-track { display: flex; align-items: center; height: 100%; padding-left: 0; transition: all 0.5s cubic-bezier(0.32, 0.725, 0, 1); gap: 40px; opacity: 1; transform: scale(1); }
.carousel-track.track-hidden { opacity: 0; transform: scale(0.9); pointer-events: none; filter: blur(10px); }
.card-wrapper { flex-shrink: 0; height: 85vh; margin-top: 60px; transition: all 0.6s cubic-bezier(0.32, 0.725, 0, 1); transform: scale(0.92); opacity: 1; filter: none; }
.card-wrapper.active { transform: scale(1); z-index: 10; }
.global-search-container { position: absolute; top: 30px; left: 50%; transform: translateX(-50%); z-index: 100; width: 600px; max-width: 90vw; transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); }
.global-search-container.search-active { top: 60px; }
.search-input-wrapper { width: 100%; height: 60px; background: var(--glass-bg); backdrop-filter: blur(30px); border: 1px solid var(--glass-border); border-radius: 20px; display: flex; align-items: center; padding: 0 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); transition: all 0.3s; }
.global-search-container.search-active .search-input-wrapper { background: var(--input-bg); box-shadow: 0 20px 60px rgba(0,0,0,0.2); border-color: #007aff; }
.search-icon { opacity: 0.6; display: flex; align-items: center; color: var(--text-main); }
.global-search-input { flex: 1; background: transparent; border: none; outline: none; font-size: 1.1rem; color: var(--text-main); margin: 0 16px; }
.close-search-btn { background: transparent; color: #007aff; font-size: 1rem; font-weight: 600; cursor: pointer; padding: 8px 12px; border-radius: 8px; transition: background 0.2s; }
.close-search-btn:hover { background: rgba(0, 122, 255, 0.1); }
.search-results-layer { position: absolute; top: 140px; left: 50%; transform: translateX(-50%); width: 700px; max-width: 90vw; height: calc(100vh - 180px); z-index: 90; display: flex; flex-direction: column; }
.search-results-list { flex: 1; overflow-y: auto; padding: 10px; scrollbar-width: none; }
.search-results-list::-webkit-scrollbar { display: none; }
.search-result-item { background: var(--glass-bg); backdrop-filter: blur(40px); border: 1px solid var(--glass-border); border-radius: 16px; padding: 20px; margin-bottom: 16px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
.search-result-item:hover { transform: scale(1.02); background: var(--input-bg); border-color: #007aff; box-shadow: 0 10px 30px rgba(0, 122, 255, 0.15); }
.res-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.res-badge { font-size: 0.8rem; font-weight: 700; color: #fff; background: var(--ios-blue); padding: 4px 10px; border-radius: 100px; }
.res-arrow { color: var(--text-sec); font-size: 1.2rem; opacity: 0; transition: opacity 0.2s; }
.search-result-item:hover .res-arrow { opacity: 1; }
.res-content { font-size: 1rem; color: var(--text-main); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.no-results, .search-placeholder { text-align: center; color: var(--text-sec); margin-top: 100px; opacity: 0.7; }
.no-res-icon { font-size: 3rem; display: block; margin-bottom: 20px; opacity: 0.5; }
.fade-up-enter-active, .fade-up-leave-active { transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translate(-50%, 40px); }
.knowledge-card { width: 100%; height: 100%; padding: 40px; display: flex; flex-direction: column; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--glass-border); padding-bottom: 15px; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 20px; }
.card-title { font-size: 2.2rem; font-weight: 700; color: var(--text-main); }
.card-icon { width: 50px; height: 50px; background: var(--input-bg); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.card-icon img { width: 70%; height: 70%; object-fit: contain; }
.hover-jelly:hover img { animation: jelly 0.6s both; }
.fab-add-note { width: 50px; height: 50px; border-radius: 50%; background: var(--text-main); color: var(--app-bg); border: none; font-size: 28px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: all 0.3s; }
.fab-add-note:hover { transform: scale(1.1) rotate(90deg); background: var(--ios-blue); color: #fff; }
.fab-add-note:disabled { opacity: 0.5; cursor: default; transform: none; background: var(--text-sec); }
.card-body-container { flex: 1; display: flex; overflow: hidden; position: relative; width: 100%; }
.notes-scroll-area { flex: 1; overflow-y: auto; padding: 4px; scrollbar-width: none; }
.notes-scroll-area::-webkit-scrollbar { display: none; }
.notes-list { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }
.note-item-wrapper { display: flex; align-items: flex-start; gap: 20px; }
.note-index { flex-shrink: 0; width: 40px; text-align: right; font-size: 1.5rem; font-weight: 700; color: var(--text-sec); opacity: 0.3; font-family: 'SF Mono', monospace; line-height: 1.6; }
.new-index { color: var(--ios-blue); opacity: 0.8; }
.note-content-area { flex: 1; min-width: 0; }
.note-card { width: 100%; border-radius: 16px; background: var(--input-bg); padding: 20px; position: relative; transition: all 0.3s; animation: popIn 0.3s; }
.blue-outline { border: 1px solid rgba(0, 122, 255, 0.3); cursor: default; }
.display-card { min-height: 60px; white-space: pre-wrap; line-height: 1.6; color: var(--text-main); font-size: 1rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.display-card:hover { border-color: #007aff; background: var(--glass-bg); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 122, 255, 0.1); }
.blue-border-active { background: var(--glass-bg); border: 2px solid #007aff; box-shadow: 0 4px 20px rgba(0, 122, 255, 0.15); display: flex; flex-direction: column; gap: 12px; }
.btn-trash { flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px; background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; margin-top: -4px; }
.btn-trash:hover { background: #ff3b30; color: #fff; transform: scale(1.1); }
.btn-cancel-x { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.05); color: var(--text-sec); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; transition: all 0.2s; }
.btn-cancel-x:hover { background: rgba(0,0,0,0.1); color: var(--text-main); transform: rotate(90deg); }
.input-card-textarea { width: 100%; min-height: 60px; border: none; background: transparent; outline: none; resize: none; font-size: 1rem; color: var(--text-main); font-family: inherit; line-height: 1.6; margin-top: 10px; }
.input-actions { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 10px; }
.btn-input { padding: 6px 16px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
.btn-clear { background: transparent; color: var(--text-sec); }
.btn-clear:hover { background: rgba(0,0,0,0.05); color: #ff3b30; }
.btn-confirm { background: var(--ios-blue); color: #fff; }
.btn-confirm:hover { background: #006be0; transform: scale(1.05); }
.card-footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.right-actions { display: flex; gap: 12px; margin-left: auto; }
button { border: none; transition: all 0.2s; }
.btn-primary-soft { background: rgba(0, 122, 255, 0.1); color: #007aff; padding: 10px 24px; border-radius: 100px; font-weight: 600; cursor: pointer; }
.btn-primary-soft:hover { background: rgba(0, 122, 255, 0.2); }
.btn-primary { background: #007aff; color: white; padding: 10px 24px; border-radius: 100px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { transform: scale(1.05); }
.btn-warning { background: #ff9500; color: white; }
.btn-warning:hover { background: #ffaa33; }
.highlight-flash { animation: flashHighlight 1.5s ease-out; border-color: #007aff !important; box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.3); }
@keyframes flashHighlight { 0% { background: rgba(0, 122, 255, 0.2); transform: scale(1.02); } 50% { background: rgba(0, 122, 255, 0.1); } 100% { background: var(--input-bg); transform: scale(1); } }
.shake-anim { animation: shake 2s infinite ease-in-out; cursor: pointer; }
@keyframes popIn { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1); } }
@keyframes jelly { 0%, 100% { transform: scale(1, 1); } 30% { transform: scale(1.25, 0.75); } 40% { transform: scale(0.75, 1.25); } 50% { transform: scale(1.15, 0.85); } 65% { transform: scale(0.95, 1.05); } 75% { transform: scale(1.05, 0.95); } }
@keyframes shake { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(0.5deg); } 75% { transform: rotate(-0.5deg); } }

/* === [核心优化] 手机端适配 === */
@media (max-width: 768px) {
  .knowledge-card { padding: 24px 20px !important; }
  .global-search-container { width: 90vw !important; top: 50px; }
  .search-results-layer { width: 90vw !important; top: 110px; }
  
  .card-header { flex-direction: row; align-items: center; padding-bottom: 12px; margin-bottom: 16px; }
  .card-title { font-size: 1.8rem; }
  .card-icon { width: 40px; height: 40px; }
  
  .note-item-wrapper { gap: 12px; }
  .note-index { font-size: 1rem; width: 24px; margin-top: 2px; }
  .note-content { font-size: 0.95rem; line-height: 1.5; }
  
  .card-footer { margin-top: 10px; }
  .right-actions { width: 100%; justify-content: space-between; }
  .right-actions button { padding: 10px 16px; font-size: 14px; flex: 1; text-align: center; }
  
  .card-body-container { height: auto; }
}
</style>