-- Esquema idempotente do Azure SQL para a Imersao Arquiteto Azure — Cloud & AI.
-- Pode ser aplicado mais de uma vez sem apagar pedidos existentes (nao usa DROP TABLE).

IF OBJECT_ID('products', 'U') IS NULL
BEGIN
  CREATE TABLE products (
    id          INT IDENTITY PRIMARY KEY,
    name        NVARCHAR(120) NOT NULL,
    description NVARCHAR(500) NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    image       NVARCHAR(255) NOT NULL,
    stock       INT NOT NULL DEFAULT 0,
    catalog_visible BIT NOT NULL DEFAULT 1
  );
END;

IF OBJECT_ID('orders', 'U') IS NULL
BEGIN
  CREATE TABLE orders (
    id             INT IDENTITY PRIMARY KEY,
    order_number   NVARCHAR(32) NULL,
    customer_session_id NVARCHAR(36) NULL,
    customer_name  NVARCHAR(120) NOT NULL,
    customer_email NVARCHAR(200) NOT NULL,
    customer_phone NVARCHAR(30) NULL,
    customer_document NVARCHAR(30) NULL,
    subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0,
    total          DECIMAL(10,2) NOT NULL,
    cep            NVARCHAR(8) NULL,
    shipping       DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_city  NVARCHAR(120) NULL,
    shipping_state NVARCHAR(20) NULL,
    shipping_address NVARCHAR(500) NULL,
    coupon_code    NVARCHAR(40) NULL,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method NVARCHAR(30) NULL,
    payment_status NVARCHAR(30) NULL,
    payment_amount DECIMAL(10,2) NULL,
    payment_paid_at DATETIME2 NULL,
    invoice_status NVARCHAR(30) NOT NULL DEFAULT N'processing',
    invoice_number NVARCHAR(80) NULL,
    invoice_issued_at DATETIME2 NULL,
    invoice_pdf_url NVARCHAR(1000) NULL,
    status         NVARCHAR(30)  NOT NULL DEFAULT N'pending',
    created_at     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('order_items', 'U') IS NULL
BEGIN
  CREATE TABLE order_items (
    id         INT IDENTITY PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    product_name NVARCHAR(120) NULL,
    product_image NVARCHAR(255) NULL,
    quantity   INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
  );
END;

IF OBJECT_ID('order_history', 'U') IS NULL
BEGIN
  CREATE TABLE order_history (
    id          INT IDENTITY PRIMARY KEY,
    order_id    INT NOT NULL REFERENCES orders(id),
    status      NVARCHAR(30) NOT NULL,
    description NVARCHAR(200) NOT NULL,
    created_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

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

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_orders_order_number' AND object_id = OBJECT_ID('orders'))
  EXEC(N'CREATE UNIQUE INDEX UX_orders_order_number ON orders(order_number) WHERE order_number IS NOT NULL');

DECLARE @catalog TABLE (
  name NVARCHAR(120) NOT NULL,
  legacy_name NVARCHAR(120) NULL,
  description NVARCHAR(500) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image NVARCHAR(255) NOT NULL,
  stock INT NOT NULL
);

INSERT INTO @catalog (name, legacy_name, description, price, image, stock) VALUES
  (N'Mochila Arquiteto Azure', N'Mochila Azure Architect', N'Mochila premium para profissionais de Cloud, Azure e arquitetura.', 249.90, N'/products/mochila_tech_azure_arquiteto.png', 20),
  (N'Caneca Mentoria Arquiteto Azure', N'Caneca Arquiteto Azure & AI', N'Caneca exclusiva da Mentoria Arquiteto Azure.', 79.90, N'/products/caneca_preta_mentoria_arquiteto_azure.png', 35),
  (N'Caneca Pós-Graduação Arquitetura de Azure com AI', N'Caneca Azure Expert', N'Caneca exclusiva da Pós-Graduação Arquitetura de Azure com AI.', 79.90, N'/products/caneca_azure_ai_pós_graduação_em_azul_neon.png', 35),
  (N'Caderno Pós-Graduação Arquitetura de Azure com AI', N'Caderno Azure Architect & AI', N'Caderno premium para projetos, diagramas, estudos e Arquiteturas Azure com AI.', 54.90, N'/products/caderno_azure_com_ai_e_caneta_premium.png', 50),
  (N'Camiseta Azure Expert', NULL, N'Camiseta exclusiva Azure Expert para profissionais que vivem Cloud e Azure.', 119.90, N'/products/camiseta_azure_expert_tech.png', 25),
  (N'Camiseta Mentoria Arquiteto Azure', N'Camiseta Azure Architect', N'Camiseta exclusiva da Mentoria Arquiteto Azure.', 119.90, N'/products/mockup_de_camiseta_arquiteto_azure.png', 25),
  (N'Camiseta Pós-Graduação Arquitetura de Azure com AI', NULL, N'Camiseta exclusiva da Pós-Graduação Arquitetura de Azure com AI.', 119.90, N'/products/camiseta_tech_azure_com_design_futurista.png', 25),
  (N'Camiseta Microsoft Certified Expert', NULL, N'Camiseta Microsoft Certified Expert.', 119.90, N'/products/Camiseta_Microsoft_Certified_Expert.png', 25);

UPDATE products SET catalog_visible = 0;

UPDATE p SET
  name = c.name,
  description = c.description,
  price = c.price,
  image = c.image,
  catalog_visible = 1
FROM products p
JOIN @catalog c ON p.name = c.name OR p.name = c.legacy_name;

INSERT INTO products (name, description, price, image, stock, catalog_visible)
SELECT c.name, c.description, c.price, c.image, c.stock, 1
FROM @catalog c
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = c.name);
