const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// ----------------------------------------------------------------
// 0. VALIDACIÓN DE CONFIGURACIÓN CRÍTICA
// Falla rápido si falta o está mal algo esencial. Mejor que el
// server no levante a que lo haga con un secret undefined o
// con NODE_ENV sin definir.
// ----------------------------------------------------------------
const REQUIRED_ENV = ['JWT_SECRET', 'NODE_ENV'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
    console.error(`❌ Faltan variables de entorno: ${missing.join(', ')}`);
    process.exit(1);
}

if (!['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    console.error(`❌ NODE_ENV inválido: "${process.env.NODE_ENV}". Debe ser development, production o test.`);
    process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET debe tener al menos 32 caracteres');
    process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    console.error('❌ FRONTEND_URL es obligatoria en producción');
    process.exit(1);
}

const app = express();


// ----------------------------------------------------------------
// 0. TRUST PROXY
// ----------------------------------------------------------------
app.set('trust proxy', 1);

// ----------------------------------------------------------------
// 1. SEGURIDAD: Helmet
// ----------------------------------------------------------------
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",              // <script> inline en el HTML
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com"
            ],
            scriptSrcAttr: [
                "'unsafe-inline'"               // onclick="..." / onchange="..." etc.
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",              // style="" inline
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://placehold.co",
                "https://*.supabase.co",
                "https://images.unsplash.com"
            ],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        },
        //reportOnly: true                        // seguimos en modo observación
    },
    crossOriginEmbedderPolicy: false
}));

// ----------------------------------------------------------------
// 2. CORS RESTRINGIDO
// ----------------------------------------------------------------
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5500', 'http://localhost:3000']; // <--- ¡Añadimos el 3000 aquí!

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
// Limiter general para toda la API. Los limiters específicos
// (loginLimiter, contactLimiter) viven en middleware/rateLimiter.js
// y se aplican dentro de sus respectivas rutas.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV !== 'production',
});
app.use('/api', limiter);

// ----------------------------------------------------------------
// 4. MIDDLEWARES ESTÁNDAR
// ----------------------------------------------------------------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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