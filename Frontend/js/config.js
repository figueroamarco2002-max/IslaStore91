// ================= CONFIGURACIÓN GLOBAL =================
// Ruta relativa para que funcione perfecto en Render y en local
const API_BASE_URL = '/api';

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

// ================= GALERÍA DE FOTOS (soporte multi-imagen opcional) =================
// Devuelve siempre un arreglo de URLs de imagen para un producto.
// - Si el producto trae `images` o `imagenes` (arreglo, ej. desde la API), se usa ese.
// - Si solo trae una imagen (imagen/image_url), se devuelve un arreglo de 1 elemento
//   para que el resto del código funcione igual que antes (compatibilidad total).
// - Si no hay ninguna, se devuelve el placeholder de siempre.
function getProductImages(producto) {
    if (Array.isArray(producto.images) && producto.images.length > 0) {
        return producto.images.filter(Boolean);
    }
    if (Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
        return producto.imagenes.filter(Boolean);
    }
    const unica = producto.imagen || producto.image_url;
    return unica ? [unica] : ['https://placehold.co/300x400/eeeeee/999999'];
}