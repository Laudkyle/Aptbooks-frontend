import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') sp.set(key, value);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

const unwrap = (p) => p.then((r) => r.data);
const idem = (options = {}) => ({ ...options, headers: ensureIdempotencyKey(options.headers ?? {}) });

export function makeCommerceApi(http) {
  const base = '/modules/commerce';
  return {
    catalog: {
      products: (params) => unwrap(http.get(`${base}/catalog/products${qs(params)}`)),
      prices: (params) => unwrap(http.get(`${base}/catalog/prices${qs(params)}`)),
      priceLists: (params) => unwrap(http.get(`${base}/price-lists${qs(params)}`)),
      createPriceList: (body, options = {}) => unwrap(http.post(`${base}/price-lists`, body, idem(options))),
      updatePriceList: (id, body, options = {}) => unwrap(http.put(`${base}/price-lists/${id}`, body, idem(options))),
      upsertPriceItem: (priceListId, body, options = {}) => unwrap(http.post(`${base}/price-lists/${priceListId}/items`, body, idem(options))),
    },
    setup: {
      stores: (params) => unwrap(http.get(`${base}/pos/stores${qs(params)}`)),
      createStore: (body, options = {}) => unwrap(http.post(`${base}/pos/stores`, body, idem(options))),
      updateStore: (id, body, options = {}) => unwrap(http.put(`${base}/pos/stores/${id}`, body, idem(options))),
      registers: (params) => unwrap(http.get(`${base}/pos/registers${qs(params)}`)),
      createRegister: (body, options = {}) => unwrap(http.post(`${base}/pos/registers`, body, idem(options))),
      updateRegister: (id, body, options = {}) => unwrap(http.put(`${base}/pos/registers/${id}`, body, idem(options))),
      accountingProfiles: (params) => unwrap(http.get(`${base}/pos/accounting-profiles${qs(params)}`)),
      saveAccountingProfile: (body, options = {}) => unwrap(http.post(`${base}/pos/accounting-profiles`, body, idem(options))),
      devices: (params) => unwrap(http.get(`${base}/pos/devices${qs(params)}`)),
      registerDevice: (body, options = {}) => unwrap(http.post(`${base}/pos/devices/register`, body, idem(options))),
      paymentMethods: (params) => unwrap(http.get(`${base}/payment-methods${qs(params)}`)),
      paymentProviders: (params) => unwrap(http.get(`${base}/payment-providers${qs(params)}`)),
      savePaymentProvider: (body, options = {}) => unwrap(http.post(`${base}/payment-providers`, body, idem(options))),
    },
    shifts: {
      list: (params) => unwrap(http.get(`${base}/pos/shifts${qs(params)}`)),
      open: (body, options = {}) => unwrap(http.post(`${base}/pos/shifts/open`, body, idem(options))),
      close: (id, body, options = {}) => unwrap(http.post(`${base}/pos/shifts/${id}/close`, body, idem(options))),
      summary: (id, params) => unwrap(http.get(`${base}/pos/shifts/${id}/summary${qs(params)}`)),
    },
    cash: {
      movements: (params) => unwrap(http.get(`${base}/cash/movements${qs(params)}`)),
      createMovement: (body, options = {}) => unwrap(http.post(`${base}/cash/movements`, body, idem(options))),
      counts: (params) => unwrap(http.get(`${base}/cash/counts${qs(params)}`)),
      createCount: (body, options = {}) => unwrap(http.post(`${base}/cash/counts`, body, idem(options))),
      deposits: (params) => unwrap(http.get(`${base}/cash/deposits${qs(params)}`)),
      createDeposit: (body, options = {}) => unwrap(http.post(`${base}/cash/deposits`, body, idem(options))),
      shiftSummary: (params) => unwrap(http.get(`${base}/cash/shift-summary${qs(params)}`)),
    },
    pos: {
      sales: (params) => unwrap(http.get(`${base}/pos/sales${qs(params)}`)),
      getSale: (id) => unwrap(http.get(`${base}/pos/sales/${id}`)),
      createSale: (body, options = {}) => unwrap(http.post(`${base}/pos/sales`, body, idem(options))),
      completeSale: (id, body = {}, options = {}) => unwrap(http.post(`${base}/pos/sales/${id}/complete`, body, idem(options))),
      postSale: (id, body = {}, options = {}) => unwrap(http.post(`${base}/pos/sales/${id}/post`, body, idem(options))),
      voidSale: (id, body = {}, options = {}) => unwrap(http.post(`${base}/pos/sales/${id}/void`, body, idem(options))),
      refundSale: (id, body = {}, options = {}) => unwrap(http.post(`${base}/pos/sales/${id}/refund`, body, idem(options))),
      receipt: (id) => unwrap(http.get(`${base}/pos/sales/${id}/receipt`)),
      emailReceipt: (id, body = {}, options = {}) => unwrap(http.post(`${base}/pos/sales/${id}/email-receipt`, body, idem(options))),
      whatsappReceipt: (id, body = {}, options = {}) => unwrap(http.post(`${base}/pos/sales/${id}/whatsapp-receipt`, body, idem(options))),
      taxPreview: (body, options = {}) => unwrap(http.post(`${base}/pos/tax-preview`, body, idem(options))),
    },
    payments: {
      initialize: (body, options = {}) => unwrap(http.post(`${base}/payments/initialize`, body, idem(options))),
      confirm: (body, options = {}) => unwrap(http.post(`${base}/payments/confirm`, body, idem(options))),
      refund: (body, options = {}) => unwrap(http.post(`${base}/payments/refund`, body, idem(options))),
      status: (id) => unwrap(http.get(`${base}/payments/${id}/status`)),
    },
    returns: {
      list: (params) => unwrap(http.get(`${base}/returns${qs(params)}`)),
      create: (body, options = {}) => unwrap(http.post(`${base}/returns`, body, idem(options))),
      approve: (id, body = {}, options = {}) => unwrap(http.post(`${base}/returns/${id}/approve`, body, idem(options))),
      reject: (id, body = {}, options = {}) => unwrap(http.post(`${base}/returns/${id}/reject`, body, idem(options))),
      receive: (id, body = {}, options = {}) => unwrap(http.post(`${base}/returns/${id}/receive`, body, idem(options))),
    },
    refunds: {
      list: (params) => unwrap(http.get(`${base}/refunds${qs(params)}`)),
      create: (body, options = {}) => unwrap(http.post(`${base}/refunds`, body, idem(options))),
      approve: (id, body = {}, options = {}) => unwrap(http.post(`${base}/refunds/${id}/approve`, body, idem(options))),
      post: (id, body = {}, options = {}) => unwrap(http.post(`${base}/refunds/${id}/post`, body, idem(options))),
    },
    promotions: {
      list: (params) => unwrap(http.get(`${base}/promotions${qs(params)}`)),
      create: (body, options = {}) => unwrap(http.post(`${base}/promotions`, body, idem(options))),
      update: (id, body, options = {}) => unwrap(http.put(`${base}/promotions/${id}`, body, idem(options))),
      preview: (body, options = {}) => unwrap(http.post(`${base}/promotions/apply-preview`, body, idem(options))),
      coupons: (params) => unwrap(http.get(`${base}/coupons${qs(params)}`)),
      createCoupon: (body, options = {}) => unwrap(http.post(`${base}/coupons`, body, idem(options))),
      validateCoupon: (body, options = {}) => unwrap(http.post(`${base}/coupons/validate`, body, idem(options))),
    },
    customers: {
      loyalty: (customerId) => unwrap(http.get(`${base}/customers/${customerId}/loyalty`)),
      adjustLoyalty: (customerId, body, options = {}) => unwrap(http.post(`${base}/customers/${customerId}/loyalty/adjust`, body, idem(options))),
      storeCredit: (customerId) => unwrap(http.get(`${base}/customers/${customerId}/store-credit`)),
      adjustStoreCredit: (customerId, body, options = {}) => unwrap(http.post(`${base}/customers/${customerId}/store-credit/adjust`, body, idem(options))),
    },
    orders: {
      list: (params) => unwrap(http.get(`${base}/orders${qs(params)}`)),
      get: (id) => unwrap(http.get(`${base}/orders/${id}`)),
      createCart: (body, options = {}) => unwrap(http.post(`${base}/cart`, body, idem(options))),
      addCartItem: (cartId, body, options = {}) => unwrap(http.post(`${base}/cart/${cartId}/items`, body, idem(options))),
      checkout: (body, options = {}) => unwrap(http.post(`${base}/checkout`, body, idem(options))),
      create: (body, options = {}) => unwrap(http.post(`${base}/orders`, body, idem(options))),
      pay: (id, body = {}, options = {}) => unwrap(http.post(`${base}/orders/${id}/pay`, body, idem(options))),
      fulfill: (id, body = {}, options = {}) => unwrap(http.post(`${base}/orders/${id}/fulfill`, body, idem(options))),
      cancel: (id, body = {}, options = {}) => unwrap(http.post(`${base}/orders/${id}/cancel`, body, idem(options))),
      refund: (id, body = {}, options = {}) => unwrap(http.post(`${base}/orders/${id}/refund`, body, idem(options))),
    },
    sync: {
      registerDevice: (body, options = {}) => unwrap(http.post(`${base}/pos/devices/register`, body, idem(options))),
      pushBatch: (body, options = {}) => unwrap(http.post(`${base}/pos/sync`, body, idem(options))),
      status: (batchId) => unwrap(http.get(`${base}/pos/sync/${batchId}/status`)),
    },
    reports: {
      dailySales: (params) => unwrap(http.get(`${base}/reports/daily-sales${qs(params)}`)),
      shiftSummary: (params) => unwrap(http.get(`${base}/reports/shift-summary${qs(params)}`)),
      cashierSales: (params) => unwrap(http.get(`${base}/reports/cashier-sales${qs(params)}`)),
      productSales: (params) => unwrap(http.get(`${base}/reports/product-sales${qs(params)}`)),
      categorySales: (params) => unwrap(http.get(`${base}/reports/category-sales${qs(params)}`)),
      grossMargin: (params) => unwrap(http.get(`${base}/reports/gross-margin${qs(params)}`)),
      taxSummary: (params) => unwrap(http.get(`${base}/reports/tax-summary${qs(params)}`)),
      paymentReconciliation: (params) => unwrap(http.get(`${base}/reports/payment-reconciliation${qs(params)}`)),
      refundsReturns: (params) => unwrap(http.get(`${base}/reports/refunds-returns${qs(params)}`)),
      discounts: (params) => unwrap(http.get(`${base}/reports/discounts${qs(params)}`)),
      customerSales: (params) => unwrap(http.get(`${base}/reports/customer-sales${qs(params)}`)),
      ecommerceOrders: (params) => unwrap(http.get(`${base}/reports/ecommerce-orders${qs(params)}`)),
    },
  };
}
