const { calculateOrderSummary, getCoupon, getPaymentMethod } = require('../public/checkout-utils');

function normalizeCustomerSessionId(value) {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value) ? value.toLowerCase() : null;
}

function orderDatePrefix(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function createOrderNumber(date, sequence) {
  return `AZS-${orderDatePrefix(date)}-${String(sequence).padStart(3, '0')}`;
}

function createOrderSnapshot({ subtotal, cep, couponCode, paymentMethod }) {
  const summary = calculateOrderSummary(subtotal, couponCode, cep);
  if (summary.shipping === null) throw Object.assign(new Error('Informe um CEP válido para calcular o frete.'), { status: 400 });
  const payment = getPaymentMethod(paymentMethod);
  if (!payment) throw Object.assign(new Error('Forma de pagamento inválida.'), { status: 400 });
  const coupon = summary.coupon ? {
    code: summary.coupon.code,
    discountPercent: summary.coupon.discountPercent,
    discountAmount: summary.discount
  } : null;
  return {
    subtotal: summary.products,
    coupon,
    shipping: { cep, amount: summary.shipping },
    payment: { method: payment.code, status: 'pending', amount: summary.total, paidAt: null },
    total: summary.total,
    status: 'pending',
    invoice: { status: 'processing', number: null, issuedAt: null, pdfUrl: null }
  };
}

module.exports = { normalizeCustomerSessionId, createOrderNumber, createOrderSnapshot, orderDatePrefix };
