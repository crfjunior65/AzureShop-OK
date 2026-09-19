(function exposeCheckoutUtils(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CheckoutUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const SHIPPING_OPTIONS = Object.freeze([12.9, 13.9, 14.9, 15.9, 16.9, 17.9, 18.9, 19.9, 20.9, 21.9, 22]);
  const COUPONS = Object.freeze({
    ARQUITETOAZURE10: Object.freeze({ code: 'ARQUITETOAZURE10', discountPercent: 10 }),
    ARQUITETURAAZUREAI20: Object.freeze({ code: 'ARQUITETURAAZUREAI20', discountPercent: 20 }),
    ARQUITETOAZUREEXPERT30: Object.freeze({ code: 'ARQUITETOAZUREEXPERT30', discountPercent: 30 })
  });
  const PAYMENT_METHODS = Object.freeze({
    pix: Object.freeze({ code: 'pix', label: 'PIX' }),
    credit_card: Object.freeze({ code: 'credit_card', label: 'Cartão de crédito' }),
    boleto: Object.freeze({ code: 'boleto', label: 'Boleto' })
  });
  const ORDER_STATUSES = Object.freeze({
    pending: 'Pendente',
    paid: 'Pago',
    processing: 'Processando',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado'
  });

  function normalizeCoupon(code) {
    return typeof code === 'string' ? code.trim().toUpperCase() : '';
  }

  function getCoupon(code) {
    return COUPONS[normalizeCoupon(code)] || null;
  }

  function getPaymentMethod(code) {
    return PAYMENT_METHODS[code] || null;
  }

  function normalizeCep(cep) {
    return String(cep || '').replace(/\D/g, '').slice(0, 8);
  }

  function formatCep(cep) {
    const digits = normalizeCep(cep);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  }

  function calculateShipping(cep) {
    const digits = normalizeCep(cep);
    if (!/^\d{8}$/.test(digits)) return null;

    const values = [...digits].map(Number);
    const weighted = values.reduce((sum, digit, index) => sum + digit * (index + 1), 0) % SHIPPING_OPTIONS.length;
    const index = (10 * weighted + Number(digits) % SHIPPING_OPTIONS.length + 5 * (Number(digits.slice(0, 5)) % SHIPPING_OPTIONS.length) + 6) % SHIPPING_OPTIONS.length;
    return SHIPPING_OPTIONS[index];
  }

  function roundMoney(value) {
    return Number(Number(value).toFixed(2));
  }

  function calculateOrderSummary(subtotal, couponCode, cep) {
    const products = roundMoney(Math.max(0, Number(subtotal) || 0));
    const coupon = getCoupon(couponCode);
    const discount = coupon ? roundMoney(products * coupon.discountPercent / 100) : 0;
    const shipping = calculateShipping(cep);
    return {
      products,
      coupon,
      discount,
      shipping,
      total: roundMoney(products - discount + (shipping || 0))
    };
  }

  return {
    COUPONS,
    PAYMENT_METHODS,
    ORDER_STATUSES,
    SHIPPING_OPTIONS,
    normalizeCoupon,
    getCoupon,
    getPaymentMethod,
    normalizeCep,
    formatCep,
    calculateShipping,
    calculateOrderSummary,
    roundMoney
  };
});
