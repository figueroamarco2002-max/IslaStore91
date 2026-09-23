const rateLimit = require('express-rate-limit');

// Máximo 5 intentos de login FALLIDOS por IP cada 15 minutos.
// Los logins exitosos NO consumen cupo (skipSuccessfulRequests),
// para no castigar a un usuario que acierta tras algunos typos.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,   // <--- ESTE es el cambio
});

// Máximo 5 mensajes de contacto por IP cada hora (evita spam en el formulario)
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Has enviado demasiados mensajes. Intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, contactLimiter };