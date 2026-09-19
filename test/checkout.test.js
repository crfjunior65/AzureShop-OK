const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SHIPPING_OPTIONS,
  calculateOrderSummary,
  calculateShipping,
  formatCep,
  getCoupon,
  normalizeCep,
  normalizeCoupon
} = require('../public/checkout-utils');

test('normaliza os três cupons sem considerar caixa ou espaços', () => {
  assert.equal(normalizeCoupon(' arquitetoazure10 '), 'ARQUITETOAZURE10');
  assert.equal(getCoupon('arquitetoazure10').discountPercent, 10);
  assert.equal(getCoupon(' ARQUITETURAAZUREAI20 ').discountPercent, 20);
  assert.equal(getCoupon('ArquitetoAzureExpert30').discountPercent, 30);
  assert.equal(getCoupon('CUPOMINVALIDO'), null);
});

test('calcula frete determinístico para CEP válido e rejeita CEP inválido', () => {
  assert.equal(formatCep('01310100'), '01310-100');
  assert.equal(normalizeCep('01310-100'), '01310100');
  assert.equal(calculateShipping('01310-100'), 13.9);
  assert.equal(calculateShipping('04538-133'), 16.9);
  assert.equal(calculateShipping('30130-010'), 18.9);
  assert.equal(calculateShipping('88010-400'), 21.9);
  assert.equal(calculateShipping('01310-100'), calculateShipping('01310100'));
  assert.equal(calculateShipping('01310-10'), null);
});

test('mantém o frete dentro dos limites comerciais mínimo e máximo', () => {
  const values = Array.from({ length: 1000 }, (_, value) => calculateShipping(String(value).padStart(8, '0')));
  assert.equal(Math.min(...values), SHIPPING_OPTIONS[0]);
  assert.equal(Math.max(...values), SHIPPING_OPTIONS.at(-1));
  assert.ok(values.every((value) => value >= 12 && value <= 22));
});

test('aplica desconto somente aos produtos e recalcula quantidade e remoção de cupom', () => {
  const withTenPercent = calculateOrderSummary(499.8, 'ARQUITETOAZURE10', '01310-100');
  assert.deepEqual(withTenPercent, {
    products: 499.8,
    coupon: { code: 'ARQUITETOAZURE10', discountPercent: 10 },
    discount: 49.98,
    shipping: 13.9,
    total: 463.72
  });
  const withTwentyPercent = calculateOrderSummary(499.8, 'ARQUITETURAAZUREAI20', '01310-100');
  assert.equal(withTwentyPercent.discount, 99.96);
  assert.equal(withTwentyPercent.total, 413.74);
  const withThirtyPercent = calculateOrderSummary(499.8, 'ARQUITETOAZUREEXPERT30', '01310-100');
  assert.equal(withThirtyPercent.discount, 149.94);
  assert.equal(withThirtyPercent.total, 363.76);
  const changedQuantity = calculateOrderSummary(2 * 249.9, 'ARQUITETOAZUREEXPERT30', '01310-100');
  assert.equal(changedQuantity.total, 363.76);
  const withoutCoupon = calculateOrderSummary(499.8, '', '01310-100');
  assert.equal(withoutCoupon.discount, 0);
  assert.equal(withoutCoupon.total, 513.7);
});
