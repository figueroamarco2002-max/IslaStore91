// ================= CONFIGURACIÓN GLOBAL =================
// Cambia SOLO esta línea cuando despliegues a producción
const API_BASE_URL = 'http://localhost:3000/api';
// en config.js
const WHATSAPP_NUMBER = '584147807688';
// ================= SEGURIDAD: ESCAPAR HTML =================
// Convierte texto en HTML seguro para insertar con innerHTML, evitando XSS
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}