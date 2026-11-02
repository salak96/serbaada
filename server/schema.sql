-- ========================================================
-- ANDROIDSTORE MULTI-SELLER API MANAGEMENT SYSTEM
-- Target Database: MySQL 8.0+
-- Encoding: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ========================================================

CREATE DATABASE IF NOT EXISTS `androidstore_db` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `androidstore_db`;

-- 1. Table: sellers (Manajemen Supplier & Endpoint API)
CREATE TABLE IF NOT EXISTS `sellers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL COMMENT 'Nama Seller/Supplier',
  `slug` VARCHAR(150) NOT NULL UNIQUE COMMENT 'Unique identifier slug',
  `base_url` VARCHAR(255) NOT NULL COMMENT 'Base URL Endpoint Supplier',
  `auth_type` ENUM('header', 'bearer', 'query', 'none') DEFAULT 'header' COMMENT 'Metode Autentikasi',
  `auth_header_key` VARCHAR(100) DEFAULT 'x-api-key' COMMENT 'Nama header autentikasi HTTP',
  `encrypted_api_key` TEXT NOT NULL COMMENT 'API Key terenkripsi AES-256-GCM',
  `encrypted_api_secret` TEXT NULL COMMENT 'API Secret terenkripsi jika ada',
  `endpoint_products` VARCHAR(255) DEFAULT '/v1/products' COMMENT 'Path endpoint daftar produk',
  `endpoint_product_detail` VARCHAR(255) DEFAULT '/v1/products/{id}' COMMENT 'Path endpoint detail produk',
  `endpoint_stock` VARCHAR(255) DEFAULT '/v1/products/{id}' COMMENT 'Path endpoint cek stok',
  `endpoint_order` VARCHAR(255) DEFAULT '/v1/order' COMMENT 'Path endpoint order',
  `endpoint_check_order` VARCHAR(255) DEFAULT '/v1/order/{id}' COMMENT 'Path endpoint cek status order',
  `request_format` ENUM('json', 'form_data') DEFAULT 'json' COMMENT 'Format request data',
  `response_mapping` JSON NULL COMMENT 'Custom JSON response mapping schema',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT 'Status aktif (1=aktif, 0=nonaktif)',
  `sync_interval_minutes` INT DEFAULT 60 COMMENT 'Interval sinkronisasi otomatis dalam menit',
  `last_synced_at` DATETIME NULL COMMENT 'Waktu terakhir sinkronisasi dijalankan',
  `last_status` ENUM('connected', 'error', 'pending') DEFAULT 'pending' COMMENT 'Status koneksi terakhir',
  `last_error_message` TEXT NULL COMMENT 'Pesan error koneksi terakhir jika ada',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_seller_active` (`is_active`),
  INDEX `idx_seller_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: supplier_products (Produk Asli Mentah dari Supplier)
CREATE TABLE IF NOT EXISTS `supplier_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_id` INT NOT NULL COMMENT 'Foreign key ke tabel sellers',
  `external_product_id` VARCHAR(150) NOT NULL COMMENT 'ID Produk asli dari API seller',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nama produk dari supplier',
  `original_category` VARCHAR(100) NULL COMMENT 'Kategori asli dari supplier',
  `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Harga modal dari supplier',
  `stock` INT NOT NULL DEFAULT 0 COMMENT 'Stok real-time dari supplier',
  `is_available` TINYINT(1) DEFAULT 1 COMMENT '1=in_stock, 0=out_of_stock',
  `description` TEXT NULL COMMENT 'Deskripsi asli dari supplier',
  `image_url` VARCHAR(500) NULL COMMENT 'Gambar asli dari supplier',
  `requires_email` TINYINT(1) DEFAULT 0 COMMENT '1 jika butuh email penerima',
  `raw_response` JSON NULL COMMENT 'Data mentah JSON asli dari API seller',
  `last_synced_at` DATETIME NULL COMMENT 'Waktu data produk ini disinkronkan',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_seller_external_id` (`seller_id`, `external_product_id`),
  INDEX `idx_supplier_prod_avail` (`is_available`),
  CONSTRAINT `fk_supplier_prod_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: master_products (Katalog Utama Androidstore.web.id)
CREATE TABLE IF NOT EXISTS `master_products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(200) NOT NULL UNIQUE COMMENT 'URL slug produk publik',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nama produk resmi Androidstore',
  `category` VARCHAR(100) NOT NULL DEFAULT 'Jasa Digital Lainnya' COMMENT 'Kategori Androidstore',
  `description` TEXT NULL COMMENT 'Deskripsi kurasi untuk pembeli',
  `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Harga modal acuan (dari supplier terpilih)',
  `selling_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Harga jual resmi Androidstore',
  `old_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Harga coret normal untuk promo',
  `discount` INT DEFAULT 0 COMMENT 'Persentase diskon visual',
  `pricing_mode` ENUM('manual', 'markup_nominal', 'markup_percent') DEFAULT 'manual' COMMENT 'Metode penentuan harga',
  `markup_value` DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Nilai markup nominal atau persentase',
  `is_wholesale` TINYINT(1) DEFAULT 0 COMMENT '1 jika mendukung harga grosir',
  `wholesale_min` INT DEFAULT 5 COMMENT 'Minimal pembelian untuk harga grosir',
  `wholesale_price` DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Harga grosir per unit',
  `primary_seller_id` INT NULL COMMENT 'Supplier utama untuk routing order',
  `backup_seller_id` INT NULL COMMENT 'Supplier cadangan jika primary gagal',
  `image_type` ENUM('upload', 'url', 'supplier') DEFAULT 'supplier' COMMENT 'Metode gambar aktif',
  `custom_image_url` VARCHAR(500) NULL COMMENT 'Path upload lokal atau link gambar custom',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '1=Tampil di katalog, 0=Disembunyikan',
  `is_featured` TINYINT(1) DEFAULT 0 COMMENT '1=Produk terlaris/unggulan',
  `stock_display_mode` ENUM('real', 'custom') DEFAULT 'real' COMMENT 'Mode tampilan stok',
  `custom_stock` INT DEFAULT 25 COMMENT 'Angka stok jika mode custom',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_master_active` (`is_active`),
  INDEX `idx_master_category` (`category`),
  INDEX `idx_master_slug` (`slug`),
  CONSTRAINT `fk_master_primary_seller` FOREIGN KEY (`primary_seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_master_backup_seller` FOREIGN KEY (`backup_seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: master_supplier_mappings (Relasi Multi-Supplier ke 1 Master Produk)
CREATE TABLE IF NOT EXISTS `master_supplier_mappings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `master_product_id` INT NOT NULL COMMENT 'Foreign key ke master_products',
  `supplier_product_id` INT NOT NULL COMMENT 'Foreign key ke supplier_products',
  `priority` INT DEFAULT 1 COMMENT '1=Utama, 2=Cadangan, 3=Cadangan 2, dst',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_master_supplier` (`master_product_id`, `supplier_product_id`),
  CONSTRAINT `fk_map_master_prod` FOREIGN KEY (`master_product_id`) REFERENCES `master_products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_map_supplier_prod` FOREIGN KEY (`supplier_product_id`) REFERENCES `supplier_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: price_history (Riwayat Perubahan Harga)
CREATE TABLE IF NOT EXISTS `price_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `master_product_id` INT NOT NULL,
  `old_cost_price` DECIMAL(15, 2) NOT NULL,
  `new_cost_price` DECIMAL(15, 2) NOT NULL,
  `old_selling_price` DECIMAL(15, 2) NOT NULL,
  `new_selling_price` DECIMAL(15, 2) NOT NULL,
  `changed_by` VARCHAR(100) DEFAULT 'Admin',
  `change_reason` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_price_hist_master` FOREIGN KEY (`master_product_id`) REFERENCES `master_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: orders (Pesanan Pelanggan)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nomor invoice unik contoh: INV-20261031-001',
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_email` VARCHAR(150) NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `customer_notes` TEXT NULL,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) DEFAULT 'QRIS',
  `payment_status` ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
  `order_status` ENUM('pending', 'processing', 'delivered', 'failed', 'cancelled') DEFAULT 'pending',
  `selected_seller_id` INT NULL COMMENT 'Seller yang menangani order ini',
  `external_order_id` VARCHAR(150) NULL COMMENT 'Order ID dari sistem API seller',
  `delivered_credentials` TEXT NULL COMMENT 'Key/Akun yang dikirimkan ke pembeli',
  `error_log` TEXT NULL COMMENT 'Log jika terjadi kendala pada seller API',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order_invoice` (`invoice_number`),
  INDEX `idx_order_status` (`order_status`),
  CONSTRAINT `fk_order_seller` FOREIGN KEY (`selected_seller_id`) REFERENCES `sellers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: order_items (Detail Item per Pesanan)
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `master_product_id` INT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `cost_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_master` FOREIGN KEY (`master_product_id`) REFERENCES `master_products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: api_logs (Pemantauan & Audit Request API Seller)
CREATE TABLE IF NOT EXISTS `api_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_id` INT NULL,
  `seller_name` VARCHAR(150) NOT NULL,
  `request_url` VARCHAR(500) NOT NULL,
  `request_method` VARCHAR(10) NOT NULL DEFAULT 'GET',
  `http_status` INT NULL,
  `duration_ms` INT NOT NULL DEFAULT 0,
  `request_payload` TEXT NULL COMMENT 'Payload aman tanpa secret',
  `response_summary` TEXT NULL COMMENT 'Ringkasan respons aman',
  `is_success` TINYINT(1) DEFAULT 1,
  `error_message` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_api_logs_seller` (`seller_id`),
  INDEX `idx_api_logs_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table: admin_users (Autentikasi Admin Dashboard)
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `role` ENUM('super_admin', 'operator') DEFAULT 'super_admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table: website_settings (Pengaturan Toko & Keuangan)
CREATE TABLE IF NOT EXISTS `website_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Settings Seed
INSERT INTO `website_settings` (`setting_key`, `setting_value`) VALUES
('store_name', 'Androidstore.web.id'),
('whatsapp_number', '6285867336036'),
('default_markup_percent', '25'),
('maintenance_mode', 'false'),
('currency_symbol', 'Rp'),
('auto_sync_enabled', 'true')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
