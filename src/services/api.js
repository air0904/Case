// src/services/api.js

const API_BASE = '/api'
const DEFAULT_TIMEOUT = 10000

// 内部工具：自动获取 Token 并组装 Header
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  }
  const token = localStorage.getItem('authToken')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// 内部工具：统一处理响应
const handleResponse = async (response) => {
  if (!response.ok) {
    // 这里可以扩展：比如监测到 401 未授权时自动跳转登录页
    const errorMsg = await response.text().catch(() => response.statusText)
    throw new Error(errorMsg || `Request failed with status ${response.status}`)
  }
  // 处理 204 No Content (比如删除成功)
  if (response.status === 204) return null
  return response.json()
}

const createRequest = async (path, options = {}) => {
  const response = await fetchWithTimeout(`${API_BASE}${path}`, options)
  return handleResponse(response)
}

export default {
  // === Auth 接口 ===
  async login(password) {
    return createRequest('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
  },

  // === Cases 接口 ===
  async getCases() {
    return createRequest('/cases', {
      headers: getHeaders()
    })
  },

  async createCase(data) {
    return createRequest('/cases', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
  },

  async updateCase(id, data) {
    return createRequest(`/cases/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
  },

  async deleteCase(id) {
    return createRequest(`/cases/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
  },

  // === Notes 接口 ===
  async getNotes() {
    return createRequest('/notes', {
      headers: getHeaders()
    })
  },

  async createNote(data) {
    return createRequest('/notes', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
  },

  async updateNote(id, data) {
    return createRequest(`/notes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    })
  },

  async deleteNote(id) {
    return createRequest(`/notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    })
  }
}
