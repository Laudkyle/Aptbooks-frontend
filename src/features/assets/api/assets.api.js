import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js'; 

// Phase 6A — Assets (backend-exact routes)

function qs(params) {
  const sp = new URLSearchParams(params ?? {}); 
  const s = sp.toString(); 
  return s ? `?${s}` : ''; 
}

export function makeAssetsApi(http) {
  return {
    // Categories
    listCategories() {
      return http.get('/modules/assets/categories').then((r) => r.data); 
    },
    createCategory(payload) {
      return http.post('/modules/assets/categories', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    getCategory(id) {
      return http.get(`/modules/assets/categories/${id}`).then((r) => r.data); 
    },
    updateCategory(id, payload) {
      return http.put(`/modules/assets/categories/${id}`, payload).then((r) => r.data); 
    },
    archiveCategory(id) {
      return http.delete(`/modules/assets/categories/${id}`).then((r) => r.data); 
    },

    // Fixed assets
    listFixedAssets(params) {
      return http.get(`/modules/assets/fixed-assets${qs(params)}`).then((r) => r.data); 
    },
    createFixedAsset(payload) {
      return http.post('/modules/assets/fixed-assets', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    getFixedAsset(id) {
      return http.get(`/modules/assets/fixed-assets/${id}`).then((r) => r.data); 
    },
    updateFixedAsset(id, payload) {
      return http.put(`/modules/assets/fixed-assets/${id}`, payload).then((r) => r.data); 
    },
    deleteFixedAsset(id) {
      return http.delete(`/modules/assets/fixed-assets/${id}`).then((r) => r.data); 
    },

    // Lifecycle actions
    acquireFixedAsset(id, payload) {
      return http.post(`/modules/assets/fixed-assets/${id}/acquire`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    retireFixedAsset(id) {
      return http.post(`/modules/assets/fixed-assets/${id}/retire`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    disposeFixedAsset(id, payload) {
      return http.post(`/modules/assets/fixed-assets/${id}/dispose`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    transferFixedAsset(id, payload) {
      return http.post(`/modules/assets/fixed-assets/${id}/transfer`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    revalueFixedAsset(id, payload) {
      return http.post(`/modules/assets/fixed-assets/${id}/revalue`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    impairFixedAsset(id, payload) {
      return http.post(`/modules/assets/fixed-assets/${id}/impair`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },

    // Depreciation
    listSchedules(params) {
      return http.get(`/modules/assets/depreciation/schedules${qs(params)}`).then((r) => r.data); 
    },
    createSchedule(payload) {
      return http.post('/modules/assets/depreciation/schedules', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    getSchedule(id) {
      return http.get(`/modules/assets/depreciation/schedules/${id}`).then((r) => r.data); 
    },
    updateSchedule(id, payload) {
      return http.put(`/modules/assets/depreciation/schedules/${id}`, payload).then((r) => r.data); 
    },
    deleteSchedule(id) {
      return http.delete(`/modules/assets/depreciation/schedules/${id}`).then((r) => r.data); 
    },
    previewPeriodEnd(periodId) {
      return http
        .get(`/modules/assets/depreciation/preview?${new URLSearchParams({ periodId }).toString()}`)
        .then((r) => r.data); 
    },
    runPeriodEnd(payload) {
      return http.post('/modules/assets/depreciation/run/period-end', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data); 
    },
    reversePeriodEnd(payload) {
      return http
        .post('/modules/assets/depreciation/reverse/period-end', payload, { headers: ensureIdempotencyKey() })
        .then((r) => r.data); 
    }
  }; 
}
