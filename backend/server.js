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
app.set('trust proxy', 1);

// ----------------------------------------------------------------
// 1. SEGURIDAD: Helmet
// ----------------------------------------------------------------
app.use(helmet({
    contentSecurityPolicy: false, // Desactivado para no bloquear scripts/estilos externos en el frontend
    crossOriginEmbedderPolicy: false // Permite incrustar imágenes locales y externas sin bloqueos
}));

// ----------------------------------------------------------------
// 2. CORS RESTRINGIDO
// ----------------------------------------------------------------
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5500'];

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
// 3. LIMITACIÓN DE PETICIONES
// ----------------------------------------------------------------
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV !== 'production',
});
app.use('/api', limiter); // Solo aplica el limitador a las rutas de la API, no a los archivos estáticos

// ----------------------------------------------------------------
// 4. MIDDLEWARES ESTÁNDAR
// ----------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            res.setHeader('Content-Type', 'image/' + path.extname(filePath).slice(1).replace('jpg', 'jpeg'));
        } else {
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

// ----------------------------------------------------------------
// 5. RUTAS DE LA API Y ARCHIVOS ESTÁTICOS DEL FRONTEND
// ----------------------------------------------------------------
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const sectionRoutes = require('./src/routes/sectionRoutes');
const typeRoutes = require('./src/routes/typeRoutes');
const styleRoutes = require('./src/routes/styleRoutes');
const proximaVezRoutes = require('./src/routes/proximaVezRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/styles', styleRoutes);
app.use('/api/proxima-vez', proximaVezRoutes);

// --- SERVIR EL FRONTEND ---
// Sube un nivel desde 'backend' y entra a 'Frontend'
app.use(express.static(path.join(__dirname, '../Frontend')));

// Redirigir cualquier otra ruta (que no sea de la API) al index.html
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// ----------------------------------------------------------------
// 6. 404 PARA RUTAS NO ENCONTRADAS (API)
// ----------------------------------------------------------------
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ----------------------------------------------------------------
// 7. MANEJADOR DE ERRORES GLOBAL
// ----------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);

    if (err.message === 'Origen no permitido por política CORS') {
        return res.status(403).json({ message: err.message });
    }

    const status = err.status || 500;
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
    console.log(`🚀 Servidor corriendo en el puerto: ${PORT}`);
});