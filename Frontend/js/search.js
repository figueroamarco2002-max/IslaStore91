/**
 * ====================================================================
 * ARCHIVO: busqueda.js (búsqueda en tiempo real)
 * DEPENDENCIA: config.js (debe cargarse antes para tener escapeHTML)
 * DESCRIPCIÓN: Maneja el panel de búsqueda, búsqueda en vivo con
 *              debounce, y la página de resultados de búsqueda completa.
 * SEGURIDAD: Todos los datos dinámicos se sanitizan con escapeHTML()
 *            antes de insertarse en el DOM.
 * ====================================================================
 */

// ====================================================================
// 1. VARIABLES GLOBALES
// ====================================================================
let searchDebounceTimer = null;

// ====================================================================
// 2. ABRIR/CERRAR PANEL DE BÚSQUEDA
// ====================================================================
function toggleSearch() {
    const panel = document.getElementById('search-panel');
    const input = document.getElementById('search-input');
    if (!panel) return;

    panel.classList.toggle('active');

    if (panel.classList.contains('active')) {
        setTimeout(() => input.focus(), 100);
    } else {
        input.value = '';
        document.getElementById('search-live-results').innerHTML = '';
    }
}

// ====================================================================
// 3. CONSTRUIR ITEM DE RESULTADO (para la vista en vivo) - SEGURO
//    Se usa escapeHTML en nombre, precio y alt de la imagen.
// ====================================================================
function buildSearchResultItem(producto) {
    const idProd = producto.id || '';
    // Sanitizamos todos los datos que se muestran
    const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
    const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
    const imagenSrc = getProductImages(producto)[0];
    const altSeguro = nombreSeguro;

    return `
    <div class="search-result-item" onclick="seleccionarResultadoBusqueda('${idProd}')">
        <div class="info-row">
            <img src="${imagenSrc}" alt="${altSeguro}" class="thumb">
            <span class="name">${nombreSeguro}</span>
        </div>
        <span class="price">$${precioSeguro}</span>
    </div>
  `;
}

// ====================================================================
// 4. SELECCIONAR UN RESULTADO DE BÚSQUEDA
//    - Cierra el panel, limpia el input y los resultados.
//    - Asegura que el producto esté registrado globalmente.
//    - Abre el modal de detalles.
// ====================================================================
async function seleccionarResultadoBusqueda(id) {
    document.getElementById('search-panel').classList.remove('active');
    document.getElementById('search-input').value = '';
    document.getElementById('search-live-results').innerHTML = '';

    // Aseguramos que el producto esté disponible antes de abrir el modal
    if (typeof products !== 'undefined' && !products.find(p => p.id === id)) {
        const encontrados = await fetchProductsFiltered({});
        registerProductsGlobally(encontrados);
    }

    if (typeof openProductDetails === 'function') {
        openProductDetails(id);
    }
}

// ====================================================================
// 5. MANEJAR BÚSQUEDA EN VIVO (con debounce)
//    - Obtiene productos filtrados por el término de búsqueda.
//    - Los registra globalmente.
//    - Renderiza los resultados usando buildSearchResultItem (seguro).
// ====================================================================
async function manejarBusquedaEnVivo() {
    const termino = document.getElementById('search-input').value.trim();
    const contenedor = document.getElementById('search-live-results');

    if (termino.length === 0) {
        contenedor.innerHTML = '';
        return;
    }

    const resultados = await fetchProductsFiltered({ search: termino });
    registerProductsGlobally(resultados);

    if (resultados.length === 0) {
        contenedor.innerHTML = '<p class="search-empty-msg">No se encontraron productos.</p>';
        return;
    }

    contenedor.innerHTML = resultados.map(buildSearchResultItem).join('');
}

// ====================================================================
// 6. EVENTO DE INPUT CON DEBOUNCE (300ms)
// ====================================================================
function onSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(manejarBusquedaEnVivo, 300);
}

// ====================================================================
// 7. CONSTRUIR TARJETA PARA LA PÁGINA DE RESULTADOS (SEGURO)
//    Similar a buildSearchResultItem, pero con estructura de grid.
// ====================================================================
function buildSearchGridCardHTML(producto) {
    const idProd = producto.id || '';
    const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
    const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
    const imagenSrc = getProductImages(producto)[0];

    const descRaw = producto.description || producto.descripcion || '';
    const descripcionSegura = escapeHTML(descRaw);

    const tipoRaw = (producto.tipo || '').trim();
    const tipoLabel = tipoRaw
        ? tipoRaw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Producto';
    const tipoSeguro = escapeHTML(tipoLabel);

    let categoriaRaw = producto.category_name || '';
    if (!categoriaRaw) {
        const idCat = producto.category_id || producto.categoria;
        categoriaRaw = idCat == 1 ? 'Hombre' : idCat == 2 ? 'Mujer' : '';
    }
    const categoriaSegura = escapeHTML(categoriaRaw);

    return `
    <div class="search-result-card show" onclick="openProductDetails('${idProd}')"
         style="border: 1px solid #B6B6B6; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(13,13,13,0.06); display: flex; flex-direction: column; cursor: pointer;">
        <div class="img-container" style="position: relative; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; background: #E7E7E7;">
            <img src="${imagenSrc}" alt="${nombreSeguro}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">

            <div style="position: absolute; top: 12px; left: 12px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                <span style="background: #0D0D0D; color: #FFFFFF; font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px 10px; border-radius: 999px;">
                    ${tipoSeguro}
                </span>
                ${categoriaSegura ? `
                <span style="background: rgba(255,255,255,0.95); color: #0D0D0D; font-size: 0.7rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(13,13,13,0.08);">
                    ${categoriaSegura}
                </span>` : ''}
            </div>
        </div>

        <div class="product-info" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
            <h3 style="margin: 0; font-size: 1.05rem; color: #0D0D0D; font-weight: 700; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${nombreSeguro}
            </h3>

            ${descripcionSegura ? `
            <p style="margin: 0; font-size: 0.85rem; color: #6E6E6E; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${descripcionSegura}
            </p>` : ''}

            <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid #EFEFEF; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 0.7rem; color: #6E6E6E; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Precio</span>
                    <span style="font-size: 1.4rem; color: #0D0D0D; font-weight: 800; line-height: 1;">$${precioSeguro}</span>
                </div>
                <button class="product-action-btn" aria-label="Añadir a la bolsa"
    onclick="event.stopPropagation(); addToCart('${idProd}')">
    <i class="fa-solid fa-cart-plus"></i>
</button>
            </div>
        </div>
    </div>
    `;
}

// ====================================================================
// 8. EJECUTAR BÚSQUEDA COMPLETA (al enviar el formulario)
//    - Muestra los resultados en una sección especial.
//    - Usa buildSearchGridCardHTML (seguro).
// ====================================================================
async function ejecutarBusquedaCompleta(event) {
    if (event) event.preventDefault();

    const termino = document.getElementById('search-input').value.trim();
    if (termino.length === 0) return;

    const resultados = await fetchProductsFiltered({ search: termino });
    registerProductsGlobally(resultados);

    const section = document.getElementById('search-results-section');
    const grid = document.getElementById('search-results-grid');
    const titulo = document.getElementById('search-results-title');

    // El título no necesita escape porque es un texto fijo con el término
    titulo.textContent = `Resultados para "${termino}" (${resultados.length})`;

    if (resultados.length === 0) {
        grid.innerHTML = '<p class="no-results" style="grid-column:1/-1;">No se encontraron productos con ese nombre.</p>';
    } else {
        grid.innerHTML = resultados.map(buildSearchGridCardHTML).join('');
    }

    section.style.display = 'block';
    document.getElementById('search-panel').classList.remove('active');
    section.scrollIntoView({ behavior: 'smooth' });
}