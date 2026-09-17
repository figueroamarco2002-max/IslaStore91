// src/utils/slugify.js

/**
 * Convierte una cadena en un slug URL-amigable.
 * Ej: "Camisetas Hombre" -> "camisetas-hombre"
 * Elimina acentos, caracteres especiales y espacios.
 */
function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .normalize('NFD')                   // separa letras de sus acentos
        .replace(/[\u0300-\u036f]/g, '')    // elimina diacríticos
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')       // solo letras, números, espacios y guiones
        .replace(/[\s_-]+/g, '-')           // reemplaza espacios y guiones por un solo guión
        .replace(/^-+|-+$/g, '');           // quita guiones al inicio o final
}

module.exports = slugify;