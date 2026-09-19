-- Tabla de administradores
CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de imágenes (relacionada con productos)
CREATE TABLE product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert de categorías de ejemplo
INSERT INTO categories (name, slug) VALUES 
('Hombre', 'hombre'),
('Mujer', 'mujer');

-- Insert de admin de ejemplo (contraseña: admin123)
-- La contraseña se hashea con bcrypt, luego en el código.

-- ============================================================
-- TABLA: Banner "Próxima Vez" - Imágenes del carrusel
-- ============================================================
CREATE TABLE proxima_vez_images (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url  TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: Banner "Próxima Vez" - Configuración (fila única)
-- ============================================================
CREATE TABLE proxima_vez_settings (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  title          TEXT NOT NULL DEFAULT 'Próxima Vez',
  subtitle       TEXT NOT NULL DEFAULT 'Esto es lo que viene...',
  banner_visible BOOLEAN DEFAULT true,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insertar el único registro de configuración (se actualiza con UPSERT)
INSERT INTO proxima_vez_settings (id, title, subtitle, banner_visible)
VALUES (1, 'Próxima Vez', 'Esto es lo que viene...', true)
ON CONFLICT (id) DO NOTHING;