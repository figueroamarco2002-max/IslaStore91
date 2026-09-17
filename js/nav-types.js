/**
 * ====================================================================
 * ARCHIVO: nav-types.js
 * DEPENDENCIA: config.js (debe cargarse antes, para API_BASE_URL y escapeHTML)
 * DESCRIPCIÓN: Reconstruye dinámicamente las opciones "Ropa/Gorras/Relojes"
 *              (y cualquier tipo nuevo que agregues, ej. "Zapatos") dentro
 *              de los desplegables "Hombres"/"Mujeres" del menú, leyendo
 *              /api/types en vez de depender de <a> escritos a mano.
 *              Funciona igual en index.html y en el resto de páginas,
 *              detectando qué funciones de filtro están disponibles.
 * SEGURIDAD: label y key se escapan con escapeHTML antes de insertarse.
 * ====================================================================
 */

async function initDynamicNavTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}/types`);
        if (!response.ok) throw new Error('No se pudieron cargar los tipos de producto');
        const types = await response.json();
        if (!Array.isArray(types) || types.length === 0) return;

        const dropdowns = document.querySelectorAll('.nav-dropdown');
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('a');
            const content = dropdown.querySelector('.dropdown-content');
            if (!trigger || !content) return;

            const triggerText = trigger.textContent.trim().toLowerCase();
            let categoria = null;
            if (triggerText.startsWith('hombre')) categoria = 'Hombre';
            else if (triggerText.startsWith('mujer')) categoria = 'Mujer';
            if (!categoria) return; // no es un desplegable de categoría de producto

            content.innerHTML = types.map(t => buildTypeLinkHTML(categoria, t)).join('');
        });
    } catch (error) {
        console.error('Error al cargar tipos dinámicos en el menú:', error);
        // Si falla, se deja el menú tal como esté en el HTML de la página
        // (no se rompe la navegación por esto).
    }
}

function buildTypeLinkHTML(categoria, type) {
    const label = escapeHTML(type.label);
    const key = escapeHTML(type.key);

    // index.html tiene setFilter()/irAlCatalogo() disponibles globalmente;
    // el resto de páginas usa sessionStorage + navega a index.html#catalogo.
    if (typeof setFilter === 'function' && typeof irAlCatalogo === 'function') {
        return `<a href="#" onclick="setFilter('categoria', '${categoria}'); setFilter('tipo', '${key}'); irAlCatalogo(); event.preventDefault();">${label}</a>`;
    }
    return `<a href="index.html#catalogo" onclick="sessionStorage.setItem('filter_categoria','${categoria}'); sessionStorage.setItem('filter_tipo','${key}');">${label}</a>`;
}

document.addEventListener('DOMContentLoaded', initDynamicNavTypes);