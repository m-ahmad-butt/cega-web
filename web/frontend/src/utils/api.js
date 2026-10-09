import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setTimeout(() => {
        window.location.href = '/login';
        isRedirecting = false;
      }, 100);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
  setupPassword: (data) => api.post('/api/auth/setup-password', data),
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
};

export const adminAPI = {
  getStats: () => api.get('/api/admin/dashboard/stats'),

  getBranches: (params) => api.get('/api/admin/branches', { params }),
  createBranch: (data) => api.post('/api/admin/branches', data),
  getBranch: (id) => api.get(`/api/admin/branches/${id}`),
  updateBranch: (id, data) => api.put(`/api/admin/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/api/admin/branches/${id}`),

  getCourses: (params) => api.get('/api/admin/courses', { params }),
  createCourse: (data) => api.post('/api/admin/courses', data),
  getCourse: (id) => api.get(`/api/admin/courses/${id}`),
  updateCourse: (id, data) => api.put(`/api/admin/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/api/admin/courses/${id}`),

  getStudents: (params) => api.get('/api/admin/students', { params }),
  createStudent: (data) => api.post('/api/admin/students', data),
  ocrCnic: (formData) =>
    api.post('/api/admin/students/ocr-cnic', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getStudent: (id) => api.get(`/api/admin/students/${id}`),
  updateStudent: (id, data) => api.put(`/api/admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/api/admin/students/${id}`),
  resetStudentPassword: (id) => api.post(`/api/admin/students/${id}/reset-password`),
  previewImport: (kind, formData) =>
    api.post(`/api/admin/import/${kind}/preview`, formData, {
      transformRequest: [(data, headers) => {
        delete headers['Content-Type'];
        return data;
      }],
    }),
  commitImport: (kind, data) => api.post(`/api/admin/import/${kind}/commit`, data),

  getStudentAssignments: (studentId) => api.get(`/api/admin/students/${studentId}/assignments`),
  assignCourse: (data) => api.post('/api/admin/assignments', data),
  bulkAssignCourses: (data) => api.post('/api/admin/assignments/bulk', data),
  removeAssignment: (id) => api.delete(`/api/admin/assignments/${id}`),

  getSlots: (params) => api.get('/api/admin/slots', { params }),
  createSlot: (data) => api.post('/api/admin/slots', data),
  updateSlot: (id, data) => api.put(`/api/admin/slots/${id}`, data),
  deleteSlot: (id) => api.delete(`/api/admin/slots/${id}`),

  getRequests: (params) => api.get('/api/admin/requests', { params }),
  handleRequest: (id, data) => api.patch(`/api/admin/requests/${id}`, data),
};

/** Unwrap `{ data: T }` / `{ student: T }` envelopes from the ExamSlot API. */
export const unwrap = (payload) => {
  if (payload == null) return payload;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.requests)) return payload.requests;
  if (Array.isArray(payload.branches)) return payload.branches;
  if (Array.isArray(payload.courses)) return payload.courses;
  if (payload.data && typeof payload.data === 'object') return payload.data;
  if (payload.student && typeof payload.student === 'object') return payload.student;
  return payload;
};

export const studentAPI = {
  getProfile: () => api.get('/api/student/profile'),
  getBranches: () => api.get('/api/student/branches'),
  selectBranch: (data) => api.post('/api/student/select-branch', data),
  getAssignedCourses: () => api.get('/api/student/assigned-courses'),
  saveDateSheet: (data) => api.post('/api/student/save-datesheet', data),
  getDateSheet: () => api.get('/api/student/datesheet'),
  downloadDateSheet: () => api.get('/api/student/datesheet/pdf', { responseType: 'blob' }),
  createRequest: (data) => api.post('/api/student/requests', data),
  getMyRequests: () => api.get('/api/student/requests'),
  agentChat: (data) => api.post('/api/student/agent/chat', data),
  agentApply: (data) => api.post('/api/student/agent/apply', data),
  agentReset: (data) => api.post('/api/student/agent/reset', data || {}),
};

export default api;
