import api from './client'

interface ReviewFilters {
  location_id?: string
  is_routed?: boolean
  status?: string
  min_rating?: number
  max_rating?: number
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }),
  listUsers: () => api.get('/auth/users'),
  inviteUser: (data: object) => api.post('/auth/users', data),
  removeUser: (id: string) => api.delete(`/auth/users/${id}`),
}

export const locationsApi = {
  list: () => api.get('/locations'),
  create: (data: object) => api.post('/locations', data),
  update: (id: string, data: object) => api.patch(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
}

export const reviewsApi = {
  list: (filters?: ReviewFilters & { page?: number; per_page?: number }) =>
    api.get('/reviews', { params: filters ?? {} }),
  stats: () => api.get('/reviews/stats'),
  submit: (data: object) => api.post('/reviews', data),
  update: (id: string, data: object) => api.patch(`/reviews/${id}`, data),
  generateResponse: (id: string) => api.post(`/reviews/${id}/generate-response`),
  requestReviews: (data: { location_id: string; emails: string[]; custom_message?: string }) =>
    api.post('/reviews/request-reviews', data),
}

export const competitorsApi = {
  list: (locationId?: string) =>
    api.get('/competitors', { params: locationId ? { location_id: locationId } : {} }),
  add: (data: object) => api.post('/competitors', data),
  update: (id: string, data: object) => api.patch(`/competitors/${id}`, data),
  delete: (id: string) => api.delete(`/competitors/${id}`),
}

export const citationsApi = {
  list: (params?: { location_id?: string; status?: string; page?: number; per_page?: number }) =>
    api.get('/citations', { params: params ?? {} }),
  summary: () => api.get('/citations/summary'),
  create: (data: object) => api.post('/citations', data),
  check: (id: string) => api.post(`/citations/${id}/check`),
  delete: (id: string) => api.delete(`/citations/${id}`),
}

export const insightsApi = {
  summary: (locationId?: string) =>
    api.get('/insights/summary', { params: locationId ? { location_id: locationId } : {} }),
  timeseries: (metric: string, locationId?: string, dateFrom?: string, dateTo?: string) =>
    api.get('/insights/timeseries', {
      params: {
        metric,
        ...(locationId ? { location_id: locationId } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      },
    }),
  importCsv: (locationId: string, file: File) => {
    const fd = new FormData()
    fd.append('location_id', locationId)
    fd.append('file', file)
    return api.post('/insights/import-csv', fd)
  },
  record: (data: object) => api.post('/insights', data),
}

export const qaApi = {
  suggestAnswer: (id: string) => api.post(`/qa/${id}/suggest-answer`),
}

export const templatesApi = {
  list: () => api.get('/templates'),
  create: (data: { name: string; body: string; tone?: string }) => api.post('/templates', data),
  update: (id: string, data: object) => api.patch(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
}

export const webhooksApi = {
  list: () => api.get('/webhooks'),
  create: (data: { url: string; events: string[] }) => api.post('/webhooks', data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  test: (id: string) => api.post(`/webhooks/${id}/test`),
  toggle: (id: string) => api.patch(`/webhooks/${id}/toggle`),
}

export const activityApi = {
  list: (limit = 50) => api.get('/activity', { params: { limit } }),
}

export const tenantApi = {
  me: () => api.get('/tenants/me'),
  update: (data: object) => api.patch('/tenants/me', data),
  regenerateApiKey: () => api.post('/tenants/regenerate-api-key'),
}

export const citationsImportApi = {
  importCsv: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/citations/import-csv', fd)
  },
}

export const billingApi = {
  plans: () => api.get('/billing/plans'),
  createSubscription: (plan_key: string) => api.post('/billing/create-subscription', { plan_key }),
  verifyPayment: (data: {
    razorpay_payment_id: string
    razorpay_subscription_id: string
    razorpay_signature: string
    plan_key: string
  }) => api.post('/billing/verify-payment', data),
}

export const firebaseAuthApi = {
  login: (id_token: string) => api.post('/auth/firebase-login', { id_token }),
}
