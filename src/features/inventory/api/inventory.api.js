import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

// Phase 6B — Inventory (backend-exact routes)

function qs(params) {
  const sp = new URLSearchParams(params ?? {});
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function makeInventoryApi(http) {
  return {
    // Categories
    listCategories() {
      return http.get('/modules/inventory/categories').then((r) => r.data);
    },
    createCategory(payload) {
      return http.post('/modules/inventory/categories', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    getCategory(id) {
      return http.get(`/modules/inventory/categories/${id}`).then((r) => r.data);
    },
    updateCategory(id, payload) {
      return http.put(`/modules/inventory/categories/${id}`, payload).then((r) => r.data);
    },
    deleteCategory(id) {
      return http.delete(`/modules/inventory/categories/${id}`).then((r) => r.data);
    },

    // Units
    listUnits() {
      return http.get('/modules/inventory/units').then((r) => r.data);
    },
    createUnit(payload) {
      return http.post('/modules/inventory/units', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    // Items
    listItems() {
      return http.get('/modules/inventory/items').then((r) => r.data);
    },
    createItem(payload) {
      return http.post('/modules/inventory/items', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    getItem(id) {
      return http.get(`/modules/inventory/items/${id}`).then((r) => r.data);
    },
    updateItem(id, payload) {
      return http.put(`/modules/inventory/items/${id}`, payload).then((r) => r.data);
    },
    deleteItem(id) {
      return http.delete(`/modules/inventory/items/${id}`).then((r) => r.data);
    },

    // Warehouses
    listWarehouses() {
      return http.get('/modules/inventory/warehouses').then((r) => r.data);
    },
    createWarehouse(payload) {
      return http.post('/modules/inventory/warehouses', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    // Inventory transactions
    listTransactions(params) {
      return http.get(`/modules/inventory/transactions${qs(params)}`).then((r) => r.data);
    },
    getCostMethod() {
      return http.get('/modules/inventory/transactions/cost-method').then((r) => r.data);
    },
    getTransaction(id) {
      return http.get(`/modules/inventory/transactions/${id}`).then((r) => r.data);
    },
    createTransaction(payload) {
      return http.post('/modules/inventory/transactions', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    approveTransaction(id) {
      return http.post(`/modules/inventory/transactions/${id}/approve`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    postTransaction(id) {
      return http.post(`/modules/inventory/transactions/${id}/post`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    voidTransaction(id, payload) {
      return http.post(`/modules/inventory/transactions/${id}/void`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    reverseTransaction(id) {
      return http.post(`/modules/inventory/transactions/${id}/reverse`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    // Stock counts
    listStockCounts(params) {
      return http.get(`/modules/inventory/stock-counts${qs(params)}`).then((r) => r.data);
    },
    createStockCount(payload) {
      return http.post('/modules/inventory/stock-counts', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    getStockCount(id) {
      return http.get(`/modules/inventory/stock-counts/${id}`).then((r) => r.data);
    },
    upsertStockCountLines(id, payload) {
      return http.post(`/modules/inventory/stock-counts/${id}/lines`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    submitStockCount(id) {
      return http.post(`/modules/inventory/stock-counts/${id}/submit`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    approveStockCount(id) {
      return http.post(`/modules/inventory/stock-counts/${id}/approve`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    postStockCount(id, payload) {
      return http.post(`/modules/inventory/stock-counts/${id}/post`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    // Reports
    valuationReport(params) {
      return http.get(`/modules/inventory/reports/valuation${qs(params)}`).then((r) => r.data);
    },
    movementsReport(params) {
      return http.get(`/modules/inventory/reports/movements${qs(params)}`).then((r) => r.data);
    }
  };
}
