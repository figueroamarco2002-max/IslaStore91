const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// ----------------------------------------------------------------
// 0. TRUST PROXY
// ----------------------------------------------------------------
// Necesario si el servidor corre detrás de un proxy/balanceador
// (Render, Railway, Heroku, Vercel, Nginx, etc.). Sin esto,
// express-rate-limit y req.ip ven la IP del proxy y no la del
// cliente real, rompiendo el rate limiting por IP.
// Ajusta el valor según tu proveedor si usas varios saltos de proxy.
app.set('trust proxy', 1);

// ----------------------------------------------------------------
// 1. SEGURIDAD: Helmet (oculta cabeceras y protege contra ataques)
// ----------------------------------------------------------------
app.use(helmet());

// ----------------------------------------------------------------
// 2. CORS RESTRINGIDO (solo dominios autorizados)
// ----------------------------------------------------------------
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5500']; // fallback para desarrollo

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por política CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// ----------------------------------------------------------------
// 3. LIMITACIÓN DE PETICIONES (protege contra ataques de fuerza bruta)
// ----------------------------------------------------------------
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Fuera de producción (desarrollo local), se desactiva por completo:
    // durante pruebas activas es normal superar 100 peticiones en 15 minutos
    // recargando la página repetidamente, y no hay necesidad real de
    // protección contra fuerza bruta en localhost. En producción sí aplica.
    skip: (req) => process.env.NODE_ENV !== 'production',
});
app.use(limiter);

// ----------------------------------------------------------------
// 4. MIDDLEWARES ESTÁNDAR
// ----------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (imágenes) - con seguridad adicional
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        // Permite que el navegador cargue estas imágenes aunque el frontend
        // esté en otro origen distinto al backend (helmet activa por defecto
        // Cross-Origin-Resource-Policy: same-origin, que bloquearía esto).
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            res.setHeader('Content-Type', 'image/' + path.extname(filePath).slice(1).replace('jpg', 'jpeg'));
        } else {
            // Cualquier archivo que no sea una de las imágenes esperadas
            // (incluido .svg) se fuerza a descarga en vez de renderizarse
            // inline, para eliminar el riesgo de XSS vía SVG con <script>.
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

// ----------------------------------------------------------------
// 5. RUTAS DE LA API
// ----------------------------------------------------------------
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const sectionRoutes = require('./src/routes/sectionRoutes');
const typeRoutes = require('./src/routes/typeRoutes');
const styleRoutes = require('./src/routes/styleRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/styles', styleRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de Jr Store funcionando correctamente');
});

// ----------------------------------------------------------------
// 6. 404 PARA RUTAS NO ENCONTRADAS
// ----------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ----------------------------------------------------------------
// 7. MANEJADOR DE ERRORES GLOBAL
// ----------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);

    // Error de CORS: status específico, mensaje seguro de mostrar.
    if (err.message === 'Origen no permitido por política CORS') {
        return res.status(403).json({ message: err.message });
    }

    const status = err.status || 500;

    // En producción, para errores 500 genéricos no se expone err.message:
    // puede contener detalles internos (rutas, nombres de columnas, etc.).
    // Los errores con status propio (4xx, ej. validaciones) sí son seguros
    // de mostrar porque fueron generados a propósito por el propio código.
    const publicMessage = (isProd && status >= 500)
        ? 'Error interno del servidor'
        : (err.message || 'Error interno del servidor');

    res.status(status).json({
        message: publicMessage,
        ...(!isProd && { stack: err.stack })
    });
});

// ----------------------------------------------------------------
// 8. INICIO DEL SERVIDOR
// ----------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📦 Orígenes CORS permitidos: ${allowedOrigins.join(', ')}`);
});