<script setup>
import { ref, watch, nextTick } from 'vue'
import { renderMarkdown } from '../utils/markdown' // [新增] 引入 Markdown 工具

const props = defineProps({
  visible: Boolean,
  mode: String,
  caseData: Object,
  allCases: { type: Array, default: () => [] }, // 确保接收父组件传来的列表
  isAdmin: Boolean,
  originRect: Object
})

const emit = defineEmits(['close', 'submit', 'update', 'delete'])

const form = ref({
  id: null, title: '', category: 'Linux', priority: 'Medium', 
  description: '', resolution: '', created_at: '', resolved_at: ''
})

const isEditing = ref(false)
const isShaking = ref(false)
const titleWarning = ref(false)
const showDeleteConfirm = ref(false)

// 动画控制
const showAnimation = ref(false)
const isPreparing = ref(false)

const resetForm = () => {
  form.value = { 
    id: null, title: '', category: 'Linux', priority: 'Medium', 
    description: '', resolution: '', created_at: '', resolved_at: ''
  }
  titleWarning.value = false
  showDeleteConfirm.value = false
  isShaking.value = false
}

// 统一时间格式化工具
const formatTime = (date) => {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `${y}/${m}/${d} ${h}:${min}:${s}`
}

// 动画逻辑
const triggerDropAnimation = () => {
  isPreparing.value = true; showAnimation.value = false
  setTimeout(() => { isPreparing.value = false; showAnimation.value = true }, 100)
}

watch(() => props.visible, (val) => {
  if (val) {
    triggerDropAnimation()
    if (props.mode === 'create') {
      resetForm(); isEditing.value = true
    } else if (props.caseData) {
      form.value = { ...props.caseData }; isEditing.value = false
    }
  } else {
    showAnimation.value = false; isPreparing.value = false
    titleWarning.value = false; isShaking.value = false; showDeleteConfirm.value = false
  }
})

watch(() => props.caseData, (newVal) => {
  if (props.visible && newVal) form.value = { ...newVal }
}, { immediate: true })

const switchCase = (direction) => {
  if (props.mode === 'create' || !props.allCases.length) return
  const currentIndex = props.allCases.findIndex(c => c.id === form.value.id)
  let nextIndex = direction === 'next' 
    ? (currentIndex + 1) % props.allCases.length 
    : (currentIndex - 1 + props.allCases.length) % props.allCases.length
  const nextCase = props.allCases[nextIndex]
  if (nextCase) {
    triggerDropAnimation()
    nextTick(() => { form.value = { ...nextCase }; isEditing.value = false })
  }
}

const triggerShake = () => { isShaking.value = true; setTimeout(() => { isShaking.value = false }, 500) }

const handleSubmit = () => {
  if (!form.value.title || !form.value.title.trim()) { titleWarning.value = true; triggerShake(); return }
  
  if (form.value.resolution && !form.value.resolved_at) {
    form.value.resolved_at = formatTime(new Date())
  }

  if (props.mode === 'create') {
    emit('submit', { ...form.value, created_at: formatTime(new Date()) })
  } else {
    emit('update', { ...form.value })
    isEditing.value = false
  }
}

const toggleEdit = () => { isEditing.value = true }
const cancelEdit = () => {
  isEditing.value = false
  const original = props.allCases.find(c => c.id === form.value.id)
  if (original) form.value = { ...original }
  else if (props.caseData) form.value = { ...props.caseData }
  titleWarning.value = false
}
const handleDeleteClick = () => { triggerShake(); showDeleteConfirm.value = true }
const confirmDelete = () => { emit('delete', form.value.id); showDeleteConfirm.value = false }
const cancelDelete = () => { showDeleteConfirm.value = false }
const handleDownload = () => {
  const mdContent = `# Case: ${form.value.title}\n\n**Category:** ${form.value.category}\n**Priority:** ${form.value.priority}\n**Created At:** ${form.value.created_at}\n**Resolved At:** ${form.value.resolved_at || 'N/A'}\n\n## Description\n${form.value.description}\n\n## Resolution\n${form.value.resolution}`
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Case_${form.value.title}.md`; link.click()
}
</script>

<template>
  <div class="case-modal-overlay" :class="{ visible: visible }">
    <button v-if="mode === 'view'" class="nav-btn prev-btn" @click.stop="switchCase('prev')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>

    <div class="glass-card modal-card" :class="{ shake: isShaking, 'animate-drop': showAnimation, 'preparing': isPreparing }">
      <div class="modal-header drop-item" style="--delay: 0s">
        <div class="header-content">
          <h2>{{ mode === 'create' ? 'New Case' : (isEditing ? 'Edit Case' : `Case #${form.id || ''}`) }}</h2>
          <span class="status-badge" :class="(form.priority || 'medium').toLowerCase()">{{ form.priority }}</span>
        </div>
      </div>

      <div class="modal-body">
        <div class="form-group drop-item" style="--delay: 0.1s">
          <label>Title <span style="color: #ff3b30" v-if="titleWarning">* Required</span></label>
          <input type="text" class="modal-input title-input" :class="{ 'input-warning': titleWarning }" v-model="form.title" :readonly="!isEditing" placeholder="Enter issue title" @input="titleWarning = false">
        </div>

        <div class="form-row drop-item" style="--delay: 0.2s">
          <div class="form-group">
            <label>Category</label>
            <select class="modal-input" v-model="form.category" :disabled="!isEditing">
              <option>MySQL</option><option>Linux</option><option>Network</option><option>Vue</option><option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select class="modal-input" v-model="form.priority" :disabled="!isEditing">
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
        </div>

        <div class="form-group drop-item" style="--delay: 0.3s">
          <label>Description</label>
          <textarea v-if="isEditing" class="modal-input textarea" v-model="form.description" placeholder="Markdown supported..."></textarea>
          <div 
            v-else 
            class="modal-input read-only-content markdown-body" 
            v-html="renderMarkdown(form.description)"
          ></div>
        </div>

        <div class="form-group drop-item" style="--delay: 0.4s">
          <label>Resolution</label>
          <textarea v-if="isEditing" class="modal-input textarea" v-model="form.resolution" placeholder="Markdown supported..."></textarea>
          <div 
            v-else 
            class="modal-input read-only-content markdown-body" 
            v-html="renderMarkdown(form.resolution || 'No resolution yet.')"
          ></div>
        </div>
        
        <div class="meta-info drop-item" style="--delay: 0.5s" v-if="mode === 'view'">
          <div class="meta-row-text"><span>Created:</span> {{ form.created_at }}</div>
          <div class="meta-row-text" v-if="form.resolved_at">
            <span class="highlight-green">Resolved:</span> {{ form.resolved_at }}
          </div>
        </div>
      </div>

      <div class="modal-footer drop-item" style="--delay: 0.5s">
        <template v-if="mode === 'create'">
          <button class="btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn-primary" @click="handleSubmit">Submit Ticket</button>
        </template>
        <template v-else-if="!isEditing">
          <button v-if="isAdmin" class="btn-danger" @click="handleDeleteClick">Delete</button>
          <div class="right-actions">
            <button class="btn-secondary" @click="handleDownload">Download</button>
            <button class="btn-secondary" @click="$emit('close')">Exit</button>
            <button v-if="isAdmin" class="btn-primary" @click="toggleEdit">Modify</button>
          </div>
        </template>
        <template v-else>
          <button class="btn-secondary" @click="cancelEdit">Cancel</button>
          <button class="btn-primary" @click="handleSubmit">Confirm</button>
        </template>
      </div>

      <transition name="fade">
        <div class="delete-confirm-overlay" v-if="showDeleteConfirm">
          <div class="confirm-box">
            <h3>Are you sure?</h3>
            <div class="confirm-actions">
              <button class="btn-secondary" @click="cancelDelete">Cancel</button>
              <button class="btn-danger" @click="confirmDelete">Delete</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
    
    <button v-if="mode === 'view'" class="nav-btn next-btn" @click.stop="switchCase('next')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
  </div>
</template>

<style scoped>
.drop-item { opacity: 1; transform: translateY(0); transition: none; }
.modal-card.preparing .drop-item { opacity: 0; transform: translateY(-20px); }
.modal-card.animate-drop .drop-item { animation: dropIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; animation-delay: var(--delay); opacity: 0; }
@keyframes dropIn { from { opacity: 0; transform: translateY(-25px); } to { opacity: 1; transform: translateY(0); } }

.case-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--modal-overlay, rgba(240, 242, 245, 0.6)); backdrop-filter: blur(20px); z-index: 1000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
.case-modal-overlay.visible { opacity: 1; pointer-events: auto; }
.modal-card { width: 600px; max-width: 90vw; height: 92vh; padding: 40px; border-radius: 35px; background: var(--glass-bg, rgba(255, 255, 255, 0.85)); border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.4)); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column; position: relative; overflow: hidden; transform: scale(0.95); opacity: 0; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.case-modal-overlay.visible .modal-card { transform: scale(1); opacity: 1; }

/* [修复] 按钮样式 - 在PC上显示 */
.nav-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 50px; height: 50px; border-radius: 50%; background: #007aff; color: white; border: none; box-shadow: 0 8px 25px rgba(0, 122, 255, 0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 1001; transition: all 0.2s; }
.nav-btn:hover { transform: translateY(-50%) scale(1.1); background: #0063d1; }
.prev-btn { left: calc(50% - 300px - 70px); }
.next-btn { right: calc(50% - 300px - 70px); }

/* ... (中间的 modal-body, form-group 等样式保持不变) ... */
.modal-header { flex-shrink: 0; margin-bottom: 20px; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { font-size: 1.8rem; font-weight: 700; color: var(--text-main); margin: 0; }
.modal-body { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; padding-right: 5px; scrollbar-width: none; }
.modal-body::-webkit-scrollbar { display: none; }
.form-row { display: flex; gap: 20px; }
.form-group { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.9rem; font-weight: 600; color: var(--text-sec); }
.modal-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--glass-border, rgba(0,0,0,0.1)); background: var(--input-bg, rgba(255,255,255,0.5)); font-size: 1rem; outline: none; transition: all 0.3s; color: var(--text-main); }
.title-input { height: 56px; font-size: 1.2rem; font-weight: 600; }
.modal-input:focus:not(:read-only) { background: #fff; border-color: #007aff; box-shadow: 0 0 0 4px rgba(0,122,255,0.1); }
.modal-input:read-only:not(select) { background: transparent; border: none; padding: 12px 0; font-weight: 500; resize: none; }
.modal-input:disabled { background: transparent; border: none; color: var(--text-main); opacity: 1; padding-left: 0; }
.input-warning { border-color: #ff3b30 !important; background-color: rgba(255, 59, 48, 0.05) !important; }
.textarea { min-height: 120px; resize: vertical; }
.read-only-content { min-height: 60px; white-space: pre-wrap; line-height: 1.6; padding: 12px 0; }
.meta-info { font-size: 0.85rem; color: var(--text-sec); text-align: right; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.05); }
.meta-row-text { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 4px; }
.highlight-green { color: #34c759; font-weight: 600; }
.modal-footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
.right-actions { display: flex; gap: 12px; }
.btn-primary { background: #007aff; color: white; padding: 10px 24px; border-radius: 20px; font-weight: 600; cursor: pointer; border: none; }
.btn-secondary { background: rgba(120, 120, 128, 0.12); color: var(--text-main); border: none; padding: 10px 24px; border-radius: 20px; font-weight: 600; cursor: pointer; }
.btn-danger { background: #ff3b30; color: white; border: none; padding: 10px 24px; border-radius: 20px; font-weight: 600; cursor: pointer; }
.status-badge { padding: 4px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
.status-badge.high { color: #ff3b30; background: rgba(255, 59, 48, 0.1); }
.status-badge.medium { color: #ff9500; background: rgba(255, 149, 0, 0.1); }
.status-badge.low { color: #34c759; background: rgba(52, 199, 89, 0.1); }
.shake { animation: shake 0.5s; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
.delete-confirm-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--glass-bg, rgba(255, 255, 255, 0.85)); backdrop-filter: blur(10px); z-index: 10; display: flex; align-items: center; justify-content: center; border-radius: 35px; color: var(--text-main); }
.confirm-box { text-align: center; animation: popIn 0.3s; }
.confirm-box h3 { font-size: 1.5rem; margin-bottom: 8px; }
.confirm-box p { color: var(--text-sec); margin-bottom: 24px; }
.confirm-actions { display: flex; gap: 16px; justify-content: center; }
@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* === [核心修复] 手机端适配 === */
@media (max-width: 768px) {
  .modal-card { width: 100% !important; height: 100% !important; border-radius: 0 !important; margin: 0 !important; position: fixed; top: 0; left: 0; }
  
  /* [修复] 在手机端显示按钮，并调整位置 */
  .nav-btn {
    display: flex; /* 确保显示 */
    position: fixed;
    top: auto; bottom: 100px; /* 放在底部，避开 Header */
    width: 44px; height: 44px;
    z-index: 1002;
    background: rgba(0, 122, 255, 0.9);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .prev-btn { left: 20px; transform: none; }
  .next-btn { right: 20px; transform: none; }
  
  .modal-body { height: calc(100% - 130px); padding: 20px 15px !important; }
  .form-row { flex-direction: column; gap: 16px; }
  .modal-footer { position: absolute; bottom: 0; left: 0; width: 100%; padding: 15px 20px; background: var(--glass-bg); border-top: 1px solid rgba(0,0,0,0.05); z-index: 100; padding-bottom: calc(15px + env(safe-area-inset-bottom)); }
  .btn-primary, .btn-secondary, .btn-danger { padding: 12px 16px !important; font-size: 15px !important; flex: 1; text-align: center; }
}
</style>