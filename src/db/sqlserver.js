const sql = require('mssql');
const { PRODUCT_CATALOG } = require('../catalog');
const { createOrderNumber, createOrderSnapshot, orderDatePrefix } = require('../orders');

function number(value) {
  return Number(value || 0);
}

function mapOrder(row, items = [], history = []) {
  const coupon = row.coupon_code ? {
    code: row.coupon_code,
    discountPercent: number(row.discount_percent),
    discountAmount: number(row.discount_amount)
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

async function synchronizeCatalog(pool) {
  await pool.request().query(`
    IF COL_LENGTH('products', 'catalog_visible') IS NULL
      ALTER TABLE products ADD catalog_visible BIT NOT NULL CONSTRAINT DF_products_catalog_visible DEFAULT 1 WITH VALUES;
    IF COL_LENGTH('products', 'image') < 510
      ALTER TABLE products ALTER COLUMN image NVARCHAR(255) NOT NULL;
    IF COL_LENGTH('orders', 'cep') IS NULL
      ALTER TABLE orders ADD cep NVARCHAR(8) NULL;
    IF COL_LENGTH('orders', 'shipping') IS NULL
      ALTER TABLE orders ADD shipping DECIMAL(10,2) NOT NULL CONSTRAINT DF_orders_shipping DEFAULT 0 WITH VALUES;
    IF COL_LENGTH('orders', 'coupon_code') IS NULL
      ALTER TABLE orders ADD coupon_code NVARCHAR(40) NULL;
    IF COL_LENGTH('orders', 'discount_amount') IS NULL
      ALTER TABLE orders ADD discount_amount DECIMAL(10,2) NOT NULL CONSTRAINT DF_orders_discount_amount DEFAULT 0 WITH VALUES;
    IF COL_LENGTH('orders', 'order_number') IS NULL
      ALTER TABLE orders ADD order_number NVARCHAR(32) NULL;
    IF COL_LENGTH('orders', 'customer_session_id') IS NULL
      ALTER TABLE orders ADD customer_session_id NVARCHAR(36) NULL;
    IF COL_LENGTH('orders', 'customer_phone') IS NULL
      ALTER TABLE orders ADD customer_phone NVARCHAR(30) NULL;
    IF COL_LENGTH('orders', 'customer_document') IS NULL
      ALTER TABLE orders ADD customer_document NVARCHAR(30) NULL;
    IF COL_LENGTH('orders', 'subtotal') IS NULL
      ALTER TABLE orders ADD subtotal DECIMAL(10,2) NOT NULL CONSTRAINT DF_orders_subtotal DEFAULT 0 WITH VALUES;
    IF COL_LENGTH('orders', 'shipping_city') IS NULL
      ALTER TABLE orders ADD shipping_city NVARCHAR(120) NULL;
    IF COL_LENGTH('orders', 'shipping_state') IS NULL
      ALTER TABLE orders ADD shipping_state NVARCHAR(20) NULL;
    IF COL_LENGTH('orders', 'shipping_address') IS NULL
      ALTER TABLE orders ADD shipping_address NVARCHAR(500) NULL;
    IF COL_LENGTH('orders', 'discount_percent') IS NULL
      ALTER TABLE orders ADD discount_percent DECIMAL(5,2) NOT NULL CONSTRAINT DF_orders_discount_percent DEFAULT 0 WITH VALUES;
    IF COL_LENGTH('orders', 'payment_method') IS NULL
      ALTER TABLE orders ADD payment_method NVARCHAR(30) NULL;
    IF COL_LENGTH('orders', 'payment_status') IS NULL
      ALTER TABLE orders ADD payment_status NVARCHAR(30) NULL;
    IF COL_LENGTH('orders', 'payment_amount') IS NULL
      ALTER TABLE orders ADD payment_amount DECIMAL(10,2) NULL;
    IF COL_LENGTH('orders', 'payment_paid_at') IS NULL
      ALTER TABLE orders ADD payment_paid_at DATETIME2 NULL;
    IF COL_LENGTH('orders', 'invoice_status') IS NULL
      ALTER TABLE orders ADD invoice_status NVARCHAR(30) NOT NULL CONSTRAINT DF_orders_invoice_status DEFAULT N'processing' WITH VALUES;
    IF COL_LENGTH('orders', 'invoice_number') IS NULL
      ALTER TABLE orders ADD invoice_number NVARCHAR(80) NULL;
    IF COL_LENGTH('orders', 'invoice_issued_at') IS NULL
      ALTER TABLE orders ADD invoice_issued_at DATETIME2 NULL;
    IF COL_LENGTH('orders', 'invoice_pdf_url') IS NULL
      ALTER TABLE orders ADD invoice_pdf_url NVARCHAR(1000) NULL;
    IF COL_LENGTH('orders', 'updated_at') IS NULL
      ALTER TABLE orders ADD updated_at DATETIME2 NOT NULL CONSTRAINT DF_orders_updated_at DEFAULT SYSUTCDATETIME() WITH VALUES;
    IF COL_LENGTH('order_items', 'product_name') IS NULL
      ALTER TABLE order_items ADD product_name NVARCHAR(120) NULL;
    IF COL_LENGTH('order_items', 'product_image') IS NULL
      ALTER TABLE order_items ADD product_image NVARCHAR(255) NULL;
    IF OBJECT_ID('order_history', 'U') IS NULL
      CREATE TABLE order_history (
        id INT IDENTITY PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id),
        status NVARCHAR(30) NOT NULL,
        description NVARCHAR(200) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_orders_order_number' AND object_id = OBJECT_ID('orders'))
      EXEC(N'CREATE UNIQUE INDEX UX_orders_order_number ON orders(order_number) WHERE order_number IS NOT NULL');
  `);

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await new sql.Request(transaction).query('UPDATE products SET catalog_visible = 0');
    for (const product of PRODUCT_CATALOG) {
      const existing = await new sql.Request(transaction)
        .input('name', sql.NVarChar(120), product.name)
        .input('legacyName', sql.NVarChar(120), product.legacyName || product.name)
        .query(`
          SELECT TOP 1 id FROM products
          WHERE name = @name OR name = @legacyName
          ORDER BY CASE WHEN name = @name THEN 0 ELSE 1 END, id
        `);
      const productId = existing.recordset[0]?.id;
      if (productId) {
        await new sql.Request(transaction)
          .input('id', sql.Int, productId)
          .input('name', sql.NVarChar(120), product.name)
          .input('description', sql.NVarChar(500), product.description)
          .input('price', sql.Decimal(10, 2), product.price)
          .input('image', sql.NVarChar(255), product.image)
          .query(`
            UPDATE products
            SET name = @name, description = @description, price = @price,
                image = @image, catalog_visible = 1
            WHERE id = @id
          `);
      } else {
        await new sql.Request(transaction)
          .input('name', sql.NVarChar(120), product.name)
          .input('description', sql.NVarChar(500), product.description)
          .input('price', sql.Decimal(10, 2), product.price)
          .input('image', sql.NVarChar(255), product.image)
          .input('stock', sql.Int, product.stock)
          .query(`
            INSERT INTO products (name, description, price, image, stock, catalog_visible)
            VALUES (@name, @description, @price, @image, @stock, 1)
          `);
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function createSqlServerRepository(config) {
  const authentication = config.auth === 'managedIdentity'
    ? { type: 'azure-active-directory-default' }
    : undefined;
  const pool = await sql.connect({
    server: config.server,
    database: config.database,
    user: authentication ? undefined : config.user,
    password: authentication ? undefined : config.password,
    authentication,
    options: { encrypt: true, trustServerCertificate: false }
  });
  await synchronizeCatalog(pool);

  const orderFields = `
    SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o
  `;

  return {
    provider: 'sqlserver',
    async listProducts() { return (await pool.request().query('SELECT id, name, description, price, image, stock FROM products WHERE catalog_visible = 1 ORDER BY id')).recordset; },
    async getProduct(id) { return (await pool.request().input('id', sql.Int, id).query('SELECT id, name, description, price, image, stock FROM products WHERE id=@id')).recordset[0]; },
    async createOrder({ customerName, customerEmail, customerSessionId, items, cep, couponCode, paymentMethod }) {
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        let subtotal = 0;
        const resolved = [];
        for (const item of items) {
          const result = await new sql.Request(transaction).input('id', sql.Int, item.productId)
            .query('SELECT id, name, price, image, stock FROM products WITH (UPDLOCK) WHERE id=@id');
          const product = result.recordset[0];
          if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > product.stock) {
            throw Object.assign(new Error('Produto ou quantidade inválida.'), { status: 400 });
          }
          subtotal += Number(product.price) * item.quantity;
          resolved.push({ product, quantity: item.quantity });
        }
        const snapshot = createOrderSnapshot({ subtotal, cep, couponCode, paymentMethod });
        const date = new Date();
        const prefix = `AZS-${orderDatePrefix(date)}-`;
        const sequence = await new sql.Request(transaction)
          .input('prefix', sql.NVarChar(20), `${prefix}%`)
          .query('SELECT COUNT(*) AS count FROM orders WITH (UPDLOCK, HOLDLOCK) WHERE order_number LIKE @prefix');
        const orderNumber = createOrderNumber(date, sequence.recordset[0].count + 1);
        const created = await new sql.Request(transaction)
          .input('orderNumber', sql.NVarChar(32), orderNumber)
          .input('session', sql.NVarChar(36), customerSessionId)
          .input('name', sql.NVarChar(120), customerName)
          .input('email', sql.NVarChar(200), customerEmail)
          .input('subtotal', sql.Decimal(10, 2), snapshot.subtotal)
          .input('total', sql.Decimal(10, 2), snapshot.total)
          .input('cep', sql.NVarChar(8), snapshot.shipping.cep)
          .input('shipping', sql.Decimal(10, 2), snapshot.shipping.amount)
          .input('couponCode', sql.NVarChar(40), snapshot.coupon?.code || null)
          .input('discountPercent', sql.Decimal(5, 2), snapshot.coupon?.discountPercent || 0)
          .input('discount', sql.Decimal(10, 2), snapshot.coupon?.discountAmount || 0)
          .input('paymentMethod', sql.NVarChar(30), snapshot.payment.method)
          .input('paymentStatus', sql.NVarChar(30), snapshot.payment.status)
          .input('paymentAmount', sql.Decimal(10, 2), snapshot.payment.amount)
          .input('invoiceStatus', sql.NVarChar(30), snapshot.invoice.status)
          .input('status', sql.NVarChar(30), snapshot.status)
          .query(`
            INSERT INTO orders (
              order_number, customer_session_id, customer_name, customer_email, subtotal, total,
              cep, shipping, coupon_code, discount_percent, discount_amount,
              payment_method, payment_status, payment_amount, invoice_status, status
            ) OUTPUT INSERTED.id VALUES (
              @orderNumber, @session, @name, @email, @subtotal, @total,
              @cep, @shipping, @couponCode, @discountPercent, @discount,
              @paymentMethod, @paymentStatus, @paymentAmount, @invoiceStatus, @status
            )
          `);
        const orderId = created.recordset[0].id;
        for (const { product, quantity } of resolved) {
          await new sql.Request(transaction)
            .input('orderId', sql.Int, orderId)
            .input('productId', sql.Int, product.id)
            .input('productName', sql.NVarChar(120), product.name)
            .input('productImage', sql.NVarChar(255), product.image)
            .input('quantity', sql.Int, quantity)
            .input('price', sql.Decimal(10, 2), product.price)
            .query(`
              INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price)
              VALUES (@orderId, @productId, @productName, @productImage, @quantity, @price);
              UPDATE products SET stock = stock - @quantity WHERE id = @productId
            `);
        }
        await new sql.Request(transaction)
          .input('orderId', sql.Int, orderId)
          .input('status', sql.NVarChar(30), snapshot.status)
          .input('description', sql.NVarChar(200), 'Pedido criado')
          .query('INSERT INTO order_history (order_id, status, description) VALUES (@orderId, @status, @description)');
        await transaction.commit();
        return {
          id: orderId,
          orderNumber,
          subtotal: snapshot.subtotal,
          discount: snapshot.coupon?.discountAmount || 0,
          shipping: snapshot.shipping.amount,
          couponCode: snapshot.coupon?.code || null,
          payment: snapshot.payment,
          total: snapshot.total,
          status: snapshot.status
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    },
    async listOrders({ customerSessionId, status, search }) {
      const request = pool.request().input('session', sql.NVarChar(36), customerSessionId);
      let query = `${orderFields} WHERE o.customer_session_id = @session`;
      if (status) {
        request.input('status', sql.NVarChar(30), status);
        query += ' AND o.status = @status';
      }
      if (search) {
        request.input('search', sql.NVarChar(40), `${search.trim().toUpperCase()}%`);
        query += ' AND o.order_number LIKE @search';
      }
      query += ' ORDER BY o.created_at DESC, o.id DESC';
      return (await request.query(query)).recordset.map((row) => mapOrder(row));
    },
    async getOrder({ orderNumber, customerSessionId }) {
      const row = (await pool.request()
        .input('orderNumber', sql.NVarChar(32), orderNumber)
        .input('session', sql.NVarChar(36), customerSessionId)
        .query(`${orderFields} WHERE o.order_number = @orderNumber AND o.customer_session_id = @session`)).recordset[0];
      if (!row) return null;
      const items = (await pool.request().input('orderId', sql.Int, row.id).query(`
        SELECT oi.product_id AS productId, COALESCE(oi.product_name, p.name) AS name,
          COALESCE(oi.product_image, p.image) AS image, oi.quantity AS quantity, oi.unit_price AS unitPrice
        FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = @orderId ORDER BY oi.id
      `)).recordset.map((item) => ({ ...item, unitPrice: number(item.unitPrice), totalPrice: number(item.unitPrice) * item.quantity }));
      const history = (await pool.request().input('orderId', sql.Int, row.id)
        .query('SELECT status, description, created_at AS createdAt FROM order_history WHERE order_id = @orderId ORDER BY created_at, id')).recordset;
      return mapOrder(row, items, history);
    },
    async health() { await pool.request().query('SELECT 1 AS ok'); return true; },
    async close() { await pool.close(); }
  };
}

module.exports = { createSqlServerRepository };
