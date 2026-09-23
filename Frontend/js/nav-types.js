/**
 * ====================================================================
 * ARCHIVO: nav-types.js
 * DEPENDENCIA: config.js (debe cargarse antes, para API_BASE_URL y escapeHTML)
 * DESCRIPCIÓN: Reconstruye dinámicamente las opciones "Ropa/Gorras/Relojes"
 *              (y cualquier tipo nuevo que agregues, ej. "Zapatos") dentro
 *              de los desplegables "Hombres"/"Mujeres" del menú, leyendo
 *              /api/types en vez de depender de <a> escritos a mano.
 *              A diferencia de antes, ya NO muestra un tipo en una
 *              categoría solo porque existe en el sistema — solo lo
 *              muestra si esa categoría tiene al menos un producto real
 *              de ese tipo (consulta /api/products para saberlo).
 *              Funciona igual en index.html y en el resto de páginas,
 *              detectando qué funciones de filtro están disponibles.
 * SEGURIDAD: label y key se escapan con escapeHTML antes de insertarse.
 * ====================================================================
 */

async function initDynamicNavTypes() {
    try {
        const [typesRes, productsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/types`),
            fetch(`${API_BASE_URL}/products`)
        ]);
        if (!typesRes.ok) throw new Error('No se pudieron cargar los tipos de producto');
        const types = await typesRes.json();
        if (!Array.isArray(types) || types.length === 0) return;

        // Si falla la carga de productos, no bloqueamos el menú por completo:
        // simplemente no podremos filtrar por contenido y se deja vacío por
        // categoría (mejor eso que mostrar tipos sin productos reales).
        const products = productsRes.ok ? await productsRes.json() : [];

        // Qué claves de tipo (en minúscula) tienen al menos un producto
        // real, separado por categoría.
        const tiposConContenido = { Hombre: new Set(), Mujer: new Set() };
        products.forEach(p => {
            const cat = (p.category_name || '').trim();
            const tipo = (p.tipo || '').trim().toLowerCase();
            if (!tipo) return;
            if (cat.toLowerCase() === 'hombre') tiposConContenido.Hombre.add(tipo);
            else if (cat.toLowerCase() === 'mujer') tiposConContenido.Mujer.add(tipo);
        });

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

            const disponibles = types.filter(t => tiposConContenido[categoria].has((t.key || '').toLowerCase()));

            if (disponibles.length === 0) {
                content.innerHTML = '<span class="dropdown-empty">Próximamente</span>';
                return;
            }

            content.innerHTML = disponibles.map(t => buildTypeLinkHTML(categoria, t)).join('');
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