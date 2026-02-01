// src/services/api.js

const API_BASE = '/api';

// 内部工具：自动获取 Token 并组装 Header
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// 内部工具：统一处理响应
const handleResponse = async (response) => {
  if (!response.ok) {
    // 这里可以扩展：比如监测到 401 未授权时自动跳转登录页
    const errorMsg = await response.text().catch(() => response.statusText);
    throw new Error(errorMsg || `Request failed with status ${response.status}`);
  }
  // 处理 204 No Content (比如删除成功)
  if (response.status === 204) return null;
  return response.json();
};

export default {
  // === Auth 接口 ===
  async login(password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return handleResponse(res);
  },

  // === Cases 接口 ===
  async getCases() {
    // GET 请求通常公开，如果需要鉴权也建议统一加上 getHeaders()
    const res = await fetch(`${API_BASE}/cases`);
    return handleResponse(res);
  },

  async createCase(data) {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCase(id, data) {
    const res = await fetch(`${API_BASE}/cases/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteCase(id) {
    const res = await fetch(`${API_BASE}/cases/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // === Notes 接口 ===
  async getNotes() {
    const res = await fetch(`${API_BASE}/notes`);
    return handleResponse(res);
  },

  async createNote(data) {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateNote(id, data) {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};