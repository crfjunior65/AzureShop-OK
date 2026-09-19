const checkout = window.CheckoutUtils;
const state = { products: [], cart: new Map(), cep: '', couponCode: '' };
const STORAGE_KEY = 'azureShopCheckout';
const ORDER_SESSION_KEY = 'azureShopOrderSessionId';
const CUSTOMER_EMAIL_KEY = 'azureShopCustomerEmail';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function saveCheckoutState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cart: [...state.cart], cep: state.cep, couponCode: state.couponCode }));
  } catch {}
}

function restoreCheckoutState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored?.cart)) {
      state.cart = new Map(stored.cart.filter(([id, quantity]) => Number.isInteger(Number(id)) && Number.isInteger(quantity) && quantity > 0).map(([id, quantity]) => [Number(id), quantity]));
    }
    state.cep = checkout.normalizeCep(stored?.cep);
    state.couponCode = checkout.getCoupon(stored?.couponCode)?.code || '';
  } catch {}
}

function customerSessionId() {
  try {
    const existing = localStorage.getItem(ORDER_SESSION_KEY);
    if (existing) return existing;
    const value = createCustomerSessionId();
    localStorage.setItem(ORDER_SESSION_KEY, value);
    return value;
  } catch {
    return createCustomerSessionId();
  }
}

function createCustomerSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const values = new Uint8Array(16);
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(values);
  else for (let index = 0; index < values.length; index += 1) values[index] = Math.floor(Math.random() * 256);
  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;
  const hex = [...values].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ordersHeaders() {
  return { 'x-customer-session-id': customerSessionId() };
}

function setFeedback(selector, message, type = '') {
  const element = $(selector);
  element.textContent = message;
  element.className = type ? `checkout-feedback ${type}` : 'checkout-feedback';
}

function cartEntries() {
  if (!state.products.length) return [];
  const entries = [...state.cart.entries()]
    .map(([id, quantity]) => ({ product: state.products.find((item) => item.id === id), quantity }))
    .filter(({ product }) => product);
  if (entries.length !== state.cart.size) {
    state.cart = new Map(entries.map(({ product, quantity }) => [product.id, quantity]));
    saveCheckoutState();
  }
  return entries;
}

function orderSummary(entries) {
  const subtotal = entries.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  return checkout.calculateOrderSummary(subtotal, state.couponCode, state.cep);
}

function renderSummary(entries, summary) {
  const hasItems = entries.length > 0;
  const shipping = hasItems ? summary.shipping : null;
  const coupon = summary.coupon;

  $('#summary-subtotal').textContent = money.format(summary.products);
  $('#discount-row').hidden = !coupon;
  $('#discount-label').textContent = coupon ? `Desconto ${coupon.discountPercent}%` : 'Desconto';
  $('#discount-value').textContent = `- ${money.format(summary.discount)}`;
  $('#applied-coupon').hidden = !coupon;
  $('#applied-coupon-code').textContent = coupon ? `Cupom ${coupon.code}` : '';
  $('#shipping-label').textContent = shipping === null ? 'Frete' : `Frete para ${checkout.formatCep(state.cep)}`;
  $('#shipping-value').textContent = shipping === null ? 'Calcular' : money.format(shipping);
  $('#change-cep').hidden = shipping === null;
  $('#cart-total').textContent = money.format(summary.products - summary.discount + (shipping || 0));
  $('#postal-code').value = checkout.formatCep(state.cep);
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error();
    state.products = await response.json();
    $('#status').textContent = `${state.products.length} produtos · API conectada`;
    renderProducts();
    renderCart();
  } catch {
    $('#status').textContent = 'API indisponível';
    $('#status').className = 'error';
  }
}

function renderProducts() {
  $('#product-grid').innerHTML = state.products.map((product) => `<article class="product"><div class="product-visual"><img src="${encodeURI(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy"></div><div class="product-info"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><div class="product-bottom"><strong>${money.format(product.price)}</strong><button data-add="${product.id}">Adicionar</button></div></div></article>`).join('');
}

function renderCart() {
  const entries = cartEntries();
  const itemCount = entries.reduce((sum, { quantity }) => sum + quantity, 0);
  const summary = orderSummary(entries);

  $('#cart-count').textContent = itemCount;
  $('#cart-items').innerHTML = entries.length
    ? entries.map(({ product, quantity }) => `<div class="cart-row"><span>${escapeHtml(product.name)}<br><small>${money.format(product.price)}</small></span><strong>${quantity}</strong><button data-remove="${product.id}" aria-label="Remover ${escapeHtml(product.name)}">−</button></div>`).join('')
    : '<p>Seu carrinho está vazio.</p>';
  renderSummary(entries, summary);
}

function toggleCart(open) {
  $('#cart').classList.toggle('open', open);
  $('#overlay').classList.toggle('open', open);
  $('#cart').setAttribute('aria-hidden', String(!open));
}

function formatDate(value) {
  return value ? dateTime.format(new Date(value.endsWith?.('Z') ? value : `${value}Z`)) : '—';
}

function orderStatusLabel(status) {
  return checkout.ORDER_STATUSES[status] || status || 'Pendente';
}

function paymentLabel(method) {
  return checkout.PAYMENT_METHODS[method]?.label || 'Não configurado';
}

function paymentStatusLabel(status) {
  return status === 'paid' ? 'Aprovado' : 'Aguardando pagamento';
}

function statusBadge(status) {
  return `<span class="status-badge status-${escapeHtml(status || 'pending')}">${escapeHtml(orderStatusLabel(status))}</span>`;
}

function renderOrders(orders) {
  const content = $('#orders-content');
  if (!orders.length) {
    content.innerHTML = '<div class="orders-empty"><h2>Você ainda não possui pedidos.</h2><p>Explore o AzureShop e faça sua primeira compra.</p><a class="primary" href="/#products">Ver produtos</a></div>';
    return;
  }
  content.innerHTML = `<div class="orders-list">${orders.map((order) => `<article class="order-card"><div><p class="order-number">#${escapeHtml(order.orderNumber)}</p><p class="order-date">${formatDate(order.createdAt)} · ${order.itemCount} item(ns)</p></div><div class="order-statuses">${statusBadge(order.status)}<span class="payment-status">${escapeHtml(paymentStatusLabel(order.payment.status))}</span></div><dl class="order-financials"><div><dt>Produtos</dt><dd>${money.format(order.subtotal)}</dd></div><div><dt>Desconto</dt><dd>- ${money.format(order.coupon?.discountAmount || 0)}</dd></div><div><dt>Frete</dt><dd>${money.format(order.shipping.amount)}</dd></div><div class="order-total"><dt>Total</dt><dd>${money.format(order.total)}</dd></div></dl><div class="order-card-footer"><span>${escapeHtml(paymentLabel(order.payment.method))}</span><a class="secondary-button" href="/orders/${encodeURIComponent(order.orderNumber)}">Ver detalhes</a></div></article>`).join('')}</div>`;
}

async function loadOrders() {
  const content = $('#orders-content');
  content.innerHTML = '<p>Carregando pedidos…</p>';
  const params = new URLSearchParams();
  const search = $('#order-search').value.trim();
  const status = $('#order-status-filter').value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  try {
    const response = await fetch(`/api/orders?${params}`, { headers: ordersHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    renderOrders(result);
  } catch {
    content.innerHTML = '<p class="error">Não foi possível carregar seus pedidos.</p>';
  }
}

function renderOrderDetail(order) {
  const detail = $('#order-detail-view');
  const success = new URLSearchParams(window.location.search).has('created');
  const coupon = order.coupon
    ? `<div class="detail-row"><span>Cupom ${escapeHtml(order.coupon.code)} (${order.coupon.discountPercent}%)</span><strong>- ${money.format(order.coupon.discountAmount)}</strong></div>`
    : '<div class="detail-row"><span>Cupom</span><strong>Nenhum cupom utilizado</strong></div>';
  const invoice = order.invoice.number
    ? `<p>NF-e #${escapeHtml(order.invoice.number)} · Emitida em ${formatDate(order.invoice.issuedAt)}</p>${order.invoice.pdfUrl ? `<a class="secondary-button" href="${escapeHtml(order.invoice.pdfUrl)}">Baixar PDF</a>` : ''}`
    : '<p>Em processamento</p>';
  detail.innerHTML = `
    ${success ? `<section class="order-success"><h1>Pedido realizado com sucesso!</h1><p>Pedido #${escapeHtml(order.orderNumber)} · Total ${money.format(order.total)}</p><a class="secondary-button" href="/#products">Continuar comprando</a></section>` : ''}
    <a class="back-link" href="/orders">← Meus pedidos</a>
    <header class="order-detail-head"><div><p class="order-number">Pedido #${escapeHtml(order.orderNumber)}</p><h1>Detalhes do pedido</h1><p>Realizado em ${formatDate(order.createdAt)}</p></div><div>${statusBadge(order.status)}<p>${escapeHtml(paymentStatusLabel(order.payment.status))}</p></div></header>
    <div class="order-detail-grid">
      <section class="detail-section order-items-section"><h2>Produtos comprados</h2>${order.items.map((item) => `<article class="order-item"><img src="${encodeURI(item.image)}" alt="${escapeHtml(item.name)}"><div><h3>${escapeHtml(item.name)}</h3><p>Quantidade: ${item.quantity}</p><p>Valor unitário: ${money.format(item.unitPrice)}</p></div><strong>${money.format(item.totalPrice)}</strong></article>`).join('')}</section>
      <aside class="detail-section financial-section"><h2>Resumo do pedido</h2><div class="detail-row"><span>Produtos</span><strong>${money.format(order.subtotal)}</strong></div>${coupon}<div class="detail-row"><span>Frete</span><strong>${money.format(order.shipping.amount)}</strong></div><div class="detail-total"><span>Total</span><strong>${money.format(order.total)}</strong></div></aside>
      <section class="detail-section"><h2>Entrega</h2><p>CEP: ${escapeHtml(checkout.formatCep(order.shipping.cep || ''))}</p>${order.shipping.city ? `<p>${escapeHtml(order.shipping.city)}${order.shipping.state ? ` · ${escapeHtml(order.shipping.state)}` : ''}</p>` : '<p>Endereço será confirmado no pagamento.</p>'}</section>
      <section class="detail-section"><h2>Cliente</h2><p>${escapeHtml(order.customer.name)}</p><p>${escapeHtml(order.customer.email)}</p>${order.customer.phone ? `<p>${escapeHtml(order.customer.phone)}</p>` : ''}</section>
      <section class="detail-section"><h2>Faturamento</h2><p>Status: ${escapeHtml(paymentStatusLabel(order.payment.status))}</p><p>Forma: ${escapeHtml(paymentLabel(order.payment.method))}</p><p>Valor: ${money.format(order.payment.amount)}</p></section>
      <section class="detail-section"><h2>Nota Fiscal</h2>${invoice}</section>
      <section class="detail-section history-section"><h2>Histórico</h2><ol>${order.history.map((event) => `<li><strong>${escapeHtml(event.description)}</strong><span>${formatDate(event.createdAt)}</span></li>`).join('')}</ol></section>
    </div>
  `;
}

async function loadOrderDetail(orderNumber) {
  const detail = $('#order-detail-view');
  detail.innerHTML = '<p>Carregando pedido…</p>';
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, { headers: ordersHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    renderOrderDetail(result);
  } catch {
    detail.innerHTML = '<a class="back-link" href="/orders">← Meus pedidos</a><p class="error">Pedido não encontrado ou não disponível para esta sessão.</p>';
  }
}

function initializeOrdersPage() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const orderNumber = parts[1];
  $('#store-content').hidden = true;
  $('#orders-page').hidden = false;
  document.title = 'Meus pedidos | AzureShop';
  if (orderNumber) {
    $('#orders-list-view').hidden = true;
    $('#order-detail-view').hidden = false;
    loadOrderDetail(orderNumber);
    return;
  }
  $('#order-search').addEventListener('input', loadOrders);
  $('#order-status-filter').addEventListener('change', loadOrders);
  loadOrders();
}

document.addEventListener('click', (event) => {
  if (event.target.dataset.add) {
    const id = Number(event.target.dataset.add);
    state.cart.set(id, (state.cart.get(id) || 0) + 1);
    saveCheckoutState();
    renderCart();
    toggleCart(true);
  }
  if (event.target.dataset.remove) {
    const id = Number(event.target.dataset.remove);
    const quantity = state.cart.get(id);
    quantity > 1 ? state.cart.set(id, quantity - 1) : state.cart.delete(id);
    saveCheckoutState();
    renderCart();
  }
});

$('#cart-button').addEventListener('click', () => toggleCart(true));
$('#close-cart').addEventListener('click', () => toggleCart(false));
$('#overlay').addEventListener('click', () => toggleCart(false));

$('#coupon-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.cart.size) {
    setFeedback('#coupon-message', 'Adicione um produto ao carrinho para usar um cupom.', 'error');
    return;
  }
  const coupon = checkout.getCoupon($('#coupon-code').value);
  if (!coupon) {
    setFeedback('#coupon-message', 'Cupom inválido ou expirado.', 'error');
    return;
  }
  state.couponCode = coupon.code;
  saveCheckoutState();
  renderCart();
  setFeedback('#coupon-message', `✓ Cupom ${coupon.code} aplicado! Você ganhou ${coupon.discountPercent}% de desconto.`, 'success');
});

$('#remove-coupon').addEventListener('click', () => {
  state.couponCode = '';
  $('#coupon-code').value = '';
  saveCheckoutState();
  renderCart();
  setFeedback('#coupon-message', 'Cupom removido.', 'success');
});

$('#postal-code').addEventListener('input', (event) => {
  state.cep = checkout.normalizeCep(event.target.value);
  event.target.value = checkout.formatCep(state.cep);
  saveCheckoutState();
  renderCart();
  if (state.cep && state.cep.length < 8) setFeedback('#cep-message', 'Informe um CEP com 8 dígitos.', 'error');
  else setFeedback('#cep-message', '');
});

$('#change-cep').addEventListener('click', () => {
  const input = $('#postal-code');
  input.focus();
  input.select();
});

$('#checkout-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#checkout-message');
  if (!state.cart.size) {
    message.textContent = 'Adicione um produto antes de finalizar.';
    message.className = 'error';
    return;
  }
  if (!checkout.calculateShipping(state.cep)) {
    message.textContent = 'Informe um CEP válido para calcular o frete.';
    message.className = 'error';
    $('#postal-code').focus();
    return;
  }

  const data = Object.fromEntries(new FormData(event.target));
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      cep: state.cep,
      couponCode: state.couponCode,
      customerSessionId: customerSessionId(),
      items: [...state.cart].map(([productId, quantity]) => ({ productId, quantity }))
    })
  });
  const result = await response.json();
  if (!response.ok) {
    message.textContent = result.error;
    message.className = 'error';
    return;
  }
  try { localStorage.setItem(CUSTOMER_EMAIL_KEY, data.customerEmail); } catch {}
  state.cart.clear();
  state.cep = '';
  state.couponCode = '';
  saveCheckoutState();
  window.location.assign(`/orders/${encodeURIComponent(result.orderNumber)}?created=1`);
});

restoreCheckoutState();
renderCart();
if (window.location.pathname.startsWith('/orders')) initializeOrdersPage();
else loadProducts();

const aiForm = $('#ai-form');
if (aiForm) {
  aiForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const box = $('#ai-result');
    const button = $('#ai-submit');
    const interest = $('#ai-interest').value.trim();
    box.className = 'ai-result';
    box.textContent = '⏳ Consultando a IA…';
    button.disabled = true;
    try {
      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest })
      });
      const result = await response.json();
      if (!response.ok) {
        box.textContent = result.error || 'Não foi possível obter recomendação.';
        box.classList.add('error');
        return;
      }
      box.innerHTML = `<div class="ai-answer">${result.recommendation.replace(/\n/g, '<br>')}</div><small class="ai-model">Modelo: ${result.model} · Azure OpenAI</small>`;
      box.classList.add('success');
    } catch {
      box.textContent = 'Falha ao contatar a IA.';
      box.classList.add('error');
    } finally {
      button.disabled = false;
    }
  });
}
