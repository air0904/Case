<script setup>
import { ref, onMounted } from 'vue'
import AuthOverlay from './components/AuthOverlay.vue'
import UserProfile from './components/UserProfile.vue'
import BasicsCard from './components/BasicsCard.vue'
import CasesCard from './components/CasesCard.vue'
import CaseModal from './components/CaseModal.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import KnowledgeCard from './components/KnowledgeCard.vue'
import Toast from './components/Toast.vue'
import { useTheme } from './composables/useTheme'
import { useCases } from './composables/useCases'
import { useNavigation } from './composables/useNavigation'

const authMode = ref('locked')
const showOverlay = ref(true)
const showKnowledge = ref(false)
const currentKnowledgeItem = ref({})
const cardOriginRect = ref(null)

const knowledgeItems = ref([
  { title: 'Linux', img: '/img/linux.png' },
  { title: 'MySQL', img: '/img/mysql.png' },
  { title: 'VUE', img: '/img/vue.png' },
  { title: 'Node.js', img: '/img/nodejs.png' },
  { title: 'Shell', img: '/img/shell.png' },
  { title: 'Python', img: '/img/python.png' },
  { title: 'Docker', img: '/img/docker.png' },
  { title: 'ITIL', img: '/img/people.png' }
])

const { isDark, initTheme, toggleTheme } = useTheme()
const {
  casesData,
  showCaseModal,
  modalMode,
  currentCase,
  caseModalOriginRect,
  loadCases,
  openCreateModal,
  openViewModal,
  handleCreateSubmit,
  handleUpdateSubmit,
  handleDeleteCase
} = useCases()

const {
  currentTab,
  navIndicatorStyle,
  isJelly,
  navRefBasics,
  navRefCases,
  switchTab,
  onPointerDown,
  onPointerUp
} = useNavigation()

const handleUnlock = (mode) => {
  authMode.value = mode
  showOverlay.value = false
  if (mode === 'guest') switchTab('basics')
  if (mode === 'admin') switchTab('cases')
}

const openKnowledgeCard = ({ item, rect }) => {
  currentKnowledgeItem.value = item
  cardOriginRect.value = rect
  showKnowledge.value = true
}

const switchKnowledgeItem = (newItem) => {
  currentKnowledgeItem.value = newItem
}

const handleAction = (action) => {
  if (action === 'switch-case') switchTab('cases')
}

onMounted(() => {
  initTheme()
  loadCases()
})
</script>

<template>
  <div class="ambient-light"></div>
  <div class="ambient-light-2"></div>

  <Toast />

  <AuthOverlay :class="{ hidden: !showOverlay }" @unlock="handleUnlock" />
  
  <div class="header-bar">
    <UserProfile :mode="authMode" />
    <ThemeToggle :isDark="isDark" @toggle="toggleTheme" />
  </div>

  <div class="page-mask" @pointerdown="onPointerDown" @pointerup="onPointerUp">
    <div class="page-track" :style="{ transform: currentTab === 'basics' ? 'translateX(0)' : 'translateX(-100vw)' }">
      
      <div class="page-section">
        <div class="section-container">
          <BasicsCard 
            :items="knowledgeItems"
            @action="handleAction" 
            @open-knowledge="openKnowledgeCard" 
          />
        </div>
      </div>

      <div class="page-section">
        <div class="section-container">
          <CasesCard 
            :cases="casesData" 
            :isAdmin="authMode === 'admin'"
            @view="openViewModal"
          />
        </div>
      </div>

    </div>
  </div>

  <nav class="bottom-nav" :class="{ visible: !showOverlay }">
    <div class="nav-indicator" :class="{ 'animate-jelly': isJelly }" :style="navIndicatorStyle"></div>
    <div class="nav-item" :class="{ active: currentTab === 'basics' }" ref="navRefBasics" @click="switchTab('basics')">Library</div>
    <div class="nav-item" :class="{ active: currentTab === 'cases' }" ref="navRefCases" @click="switchTab('cases')">Cases</div>
  </nav>

  <div 
    v-if="authMode === 'admin'"
    class="fab-add" 
    :class="{ 'fab-hidden': currentTab !== 'cases' }"
    @click="(e) => openCreateModal(e)"
  >+</div>

  <CaseModal 
    :visible="showCaseModal"
    :mode="modalMode"
    :caseData="currentCase"
    :allCases="casesData" 
    :isAdmin="authMode === 'admin'"
    :originRect="caseModalOriginRect"
    @close="showCaseModal = false"
    @submit="handleCreateSubmit"
    @update="handleUpdateSubmit"
    @delete="handleDeleteCase"
  />

  <KnowledgeCard 
    :visible="showKnowledge"
    :data="currentKnowledgeItem"
    :allItems="knowledgeItems"
    :isAdmin="authMode === 'admin'"
    :originRect="cardOriginRect" 
    @close="showKnowledge = false"
    @switch="switchKnowledgeItem"
  />
</template>

<style scoped>
/* 保持原有 style 即可，Toast 样式在 Toast.vue 中 */
.page-mask { width: 100vw; height: 100vh; overflow: hidden; position: relative; z-index: 10; }
.page-track { display: flex; width: 200vw; height: 100%; transition: transform 0.6s cubic-bezier(0.32, 0.725, 0, 1); }
.page-section { width: 100vw; height: 100%; flex-shrink: 0; display: flex; justify-content: center; align-items: center; padding-top: 80px; padding-bottom: 90px; }
.section-container { width: 95%; max-width: 1400px; height: 100%; position: relative; }

.fab-add {
  position: fixed; right: 30px; bottom: 120px;
  width: 56px; height: 56px;
  background: var(--ios-blue); color: white;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 32px; cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.4);
  z-index: 100; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fab-add:hover { transform: scale(1.1) rotate(90deg); box-shadow: 0 12px 32px rgba(0, 122, 255, 0.5); }
.fab-hidden { transform: scale(0) rotate(-180deg); opacity: 0; pointer-events: none; }

@media (max-width: 768px) {
  .section-container { width: 100%; padding: 0 10px; }
  .fab-add { right: 20px; bottom: 100px; width: 50px; height: 50px; }
  .bottom-nav { z-index: 1000; }
}
</style>
