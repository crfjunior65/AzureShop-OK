const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { PRODUCT_CATALOG } = require('../catalog');
const { createOrderNumber, createOrderSnapshot, orderDatePrefix } = require('../orders');

function synchronizeCatalog(db) {
  const columns = db.prepare('PRAGMA table_info(products)').all();
  if (!columns.some((column) => column.name === 'catalog_visible')) {
    db.exec('ALTER TABLE products ADD COLUMN catalog_visible INTEGER NOT NULL DEFAULT 1');
  }

  const deactivateAll = db.prepare('UPDATE products SET catalog_visible = 0');
  const findExisting = db.prepare(`
    SELECT id FROM products
    WHERE name = ? OR name = ?
    ORDER BY CASE WHEN name = ? THEN 0 ELSE 1 END, id
    LIMIT 1
  `);
  const updateProduct = db.prepare(`
    UPDATE products
    SET name = ?, description = ?, price = ?, image = ?, catalog_visible = 1
    WHERE id = ?
  `);
  const insertProduct = db.prepare(`
    INSERT INTO products (name, description, price, image, stock, catalog_visible)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  db.transaction(() => {
    deactivateAll.run();
    for (const product of PRODUCT_CATALOG) {
      const existing = findExisting.get(product.name, product.legacyName || product.name, product.name);
      if (existing) updateProduct.run(product.name, product.description, product.price, product.image, existing.id);
      else insertProduct.run(product.name, product.description, product.price, product.image, product.stock);
    }
  })();
}

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((entry) => entry.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function number(value) {
  return Number(value || 0);
}

function mapOrder(row, items = [], history = []) {
  const coupon = row.coupon_code ? {
    code: row.coupon_code,
    discountPercent: number(row.discount_percent),
    discountAmount: number(row.discount)
  } : null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    status: row.status,
    itemCount: number(row.item_count),
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone || null,
      document: row.customer_document || null
    },
    items,
    subtotal: number(row.subtotal),
    coupon,
    shipping: {
      cep: row.cep,
      city: row.shipping_city || null,
      state: row.shipping_state || null,
      address: row.shipping_address || null,
      amount: number(row.shipping)
    },
    payment: {
      method: row.payment_method || 'not_configured',
      status: row.payment_status || 'pending',
      amount: number(row.payment_amount || row.total),
      paidAt: row.payment_paid_at || null
    },
    invoice: {
      status: row.invoice_status || 'processing',
      number: row.invoice_number || null,
      issuedAt: row.invoice_issued_at || null,
      pdfUrl: row.invoice_pdf_url || null
    },
    total: number(row.total),
    history
  };
}

function createSqliteRepository(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      catalog_visible INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      customer_session_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_document TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      cep TEXT,
      shipping REAL NOT NULL DEFAULT 0,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_address TEXT,
      coupon_code TEXT,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      payment_status TEXT,
      payment_amount REAL,
      payment_paid_at TEXT,
      invoice_status TEXT NOT NULL DEFAULT 'processing',
      invoice_number TEXT,
      invoice_issued_at TEXT,
      invoice_pdf_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT,
      product_image TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensureColumn(db, 'orders', 'order_number', 'TEXT');
  ensureColumn(db, 'orders', 'customer_session_id', 'TEXT');
  ensureColumn(db, 'orders', 'customer_phone', 'TEXT');
  ensureColumn(db, 'orders', 'customer_document', 'TEXT');
  ensureColumn(db, 'orders', 'subtotal', 'REAL NOT NULL DEFAULT 0');
  ensureColumn(db, 'orders', 'shipping_city', 'TEXT');
  ensureColumn(db, 'orders', 'shipping_state', 'TEXT');
  ensureColumn(db, 'orders', 'shipping_address', 'TEXT');
  ensureColumn(db, 'orders', 'discount_percent', 'REAL NOT NULL DEFAULT 0');
  ensureColumn(db, 'orders', 'payment_method', 'TEXT');
  ensureColumn(db, 'orders', 'payment_status', 'TEXT');
  ensureColumn(db, 'orders', 'payment_amount', 'REAL');
  ensureColumn(db, 'orders', 'payment_paid_at', 'TEXT');
  ensureColumn(db, 'orders', 'invoice_status', "TEXT NOT NULL DEFAULT 'processing'");
  ensureColumn(db, 'orders', 'invoice_number', 'TEXT');
  ensureColumn(db, 'orders', 'invoice_issued_at', 'TEXT');
  ensureColumn(db, 'orders', 'invoice_pdf_url', 'TEXT');
  ensureColumn(db, 'orders', 'updated_at', 'TEXT');
  db.exec('UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL');
  ensureColumn(db, 'order_items', 'product_name', 'TEXT');
  ensureColumn(db, 'order_items', 'product_image', 'TEXT');
  synchronizeCatalog(db);

  const orderFields = `
    SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o
  `;

  return {
    provider: 'sqlite',
    async listProducts() { return db.prepare('SELECT * FROM products WHERE catalog_visible = 1 ORDER BY id').all(); },
    async getProduct(id) { return db.prepare('SELECT * FROM products WHERE id = ?').get(id); },
    async createOrder({ customerName, customerEmail, customerSessionId, items, cep, couponCode, paymentMethod }) {
      return db.transaction(() => {
        let subtotal = 0;
        const resolved = items.map(({ productId, quantity }) => {
          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
          if (!product) throw Object.assign(new Error(`Produto ${productId} não encontrado.`), { status: 400 });
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.stock) {
            throw Object.assign(new Error(`Quantidade inválida para ${product.name}.`), { status: 400 });
          }
          subtotal += product.price * quantity;
          return { product, quantity };
        });
        const snapshot = createOrderSnapshot({ subtotal, cep, couponCode, paymentMethod });
        const date = new Date();
        const prefix = `AZS-${orderDatePrefix(date)}-`;
        const sequence = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE order_number LIKE ?').get(`${prefix}%`).count + 1;
        const orderNumber = createOrderNumber(date, sequence);
        const order = db.prepare(`
          INSERT INTO orders (
            order_number, customer_session_id, customer_name, customer_email, subtotal, total,
            cep, shipping, coupon_code, discount_percent, discount,
            payment_method, payment_status, payment_amount, payment_paid_at,
            invoice_status, status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          orderNumber,
          customerSessionId,
          customerName,
          customerEmail,
          snapshot.subtotal,
          snapshot.total,
          snapshot.shipping.cep,
          snapshot.shipping.amount,
          snapshot.coupon?.code || null,
          snapshot.coupon?.discountPercent || 0,
          snapshot.coupon?.discountAmount || 0,
          snapshot.payment.method,
          snapshot.payment.status,
          snapshot.payment.amount,
          snapshot.payment.paidAt,
          snapshot.invoice.status,
          snapshot.status
        );
        const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)');
        const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        for (const { product, quantity } of resolved) {
          addItem.run(order.lastInsertRowid, product.id, product.name, product.image, quantity, product.price);
          reduceStock.run(quantity, product.id);
        }
        db.prepare('INSERT INTO order_history (order_id, status, description) VALUES (?, ?, ?)').run(order.lastInsertRowid, snapshot.status, 'Pedido criado');
        return {
          id: Number(order.lastInsertRowid),
          orderNumber,
          subtotal: snapshot.subtotal,
          discount: snapshot.coupon?.discountAmount || 0,
          shipping: snapshot.shipping.amount,
          couponCode: snapshot.coupon?.code || null,
          payment: snapshot.payment,
          total: snapshot.total,
          status: snapshot.status
        };
      })();
    },
    async listOrders({ customerSessionId, status, search }) {
      const filters = ['o.customer_session_id = ?'];
      const params = [customerSessionId];
      if (status) {
        filters.push('o.status = ?');
        params.push(status);
      }
      if (search) {
        filters.push('o.order_number LIKE ?');
        params.push(`${search.trim().toUpperCase()}%`);
      }
      const rows = db.prepare(`${orderFields} WHERE ${filters.join(' AND ')} ORDER BY o.created_at DESC, o.id DESC`).all(...params);
      return rows.map((row) => mapOrder(row));
    },
    async getOrder({ orderNumber, customerSessionId }) {
      const row = db.prepare(`${orderFields} WHERE o.order_number = ? AND o.customer_session_id = ?`).get(orderNumber, customerSessionId);
      if (!row) return null;
      const items = db.prepare(`
        SELECT oi.product_id AS productId, COALESCE(oi.product_name, p.name) AS name,
          COALESCE(oi.product_image, p.image) AS image, oi.quantity AS quantity, oi.unit_price AS unitPrice
        FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ? ORDER BY oi.id
      `).all(row.id).map((item) => ({ ...item, unitPrice: number(item.unitPrice), totalPrice: number(item.unitPrice) * item.quantity }));
      const history = db.prepare('SELECT status, description, created_at AS createdAt FROM order_history WHERE order_id = ? ORDER BY created_at, id').all(row.id);
      return mapOrder(row, items, history);
    },
    async health() { db.prepare('SELECT 1').get(); return true; },
    async close() { db.close(); }
  };
}

module.exports = { createSqliteRepository };
