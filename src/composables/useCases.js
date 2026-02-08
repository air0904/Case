import { ref } from 'vue'
import api from '../services/api'
import { showToast } from '../utils/toast'

export const useCases = () => {
  const casesData = ref([])
  const showCaseModal = ref(false)
  const modalMode = ref('view')
  const currentCase = ref(null)
  const caseModalOriginRect = ref(null)

  const loadCases = async () => {
    try {
      const data = await api.getCases()
      casesData.value = data
    } catch (error) {
      console.error('加载失败', error)
      showToast('Failed to load cases', 'error')
    }
  }

  const openCreateModal = (event) => {
    if (event && event.currentTarget) {
      caseModalOriginRect.value = event.currentTarget.getBoundingClientRect()
    }
    modalMode.value = 'create'
    currentCase.value = null
    showCaseModal.value = true
  }

  const openViewModal = ({ item, rect }) => {
    caseModalOriginRect.value = rect
    modalMode.value = 'view'
    currentCase.value = item
    showCaseModal.value = true
  }

  const handleCreateSubmit = async (newItem) => {
    const timeStr = newItem.created_at || ''
    const newId = Number(timeStr.replace(/\D/g, '')) || Date.now()
    const payload = { ...newItem, id: newId }

    casesData.value.unshift(payload)
    showCaseModal.value = false

    try {
      await api.createCase(payload)
      showToast('Case created successfully!')
    } catch (error) {
      console.error('保存失败', error)
      showToast('Failed to create case', 'error')
      loadCases()
    }
  }

  const handleUpdateSubmit = async (updatedItem) => {
    const index = casesData.value.findIndex(c => c.id === updatedItem.id)
    if (index !== -1) casesData.value[index] = updatedItem

    try {
      await api.updateCase(updatedItem.id, updatedItem)
      showToast('Case updated!')
    } catch (error) {
      console.error('更新失败', error)
      showToast('Failed to update case', 'error')
      loadCases()
    }
  }

  const handleDeleteCase = async (id) => {
    casesData.value = casesData.value.filter(c => c.id !== id)
    showCaseModal.value = false

    try {
      await api.deleteCase(id)
      showToast('Case deleted')
    } catch (error) {
      console.error('删除失败', error)
      showToast('Failed to delete case', 'error')
      loadCases()
    }
  }

  return {
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
  }
}
