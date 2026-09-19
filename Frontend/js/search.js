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
    const altSeguro = nombreSeguro;

    return `
    <div class="search-result-card show" onclick="openProductDetails('${idProd}')">
        <div class="img-container">
            <img src="${imagenSrc}" alt="${altSeguro}">
        </div>
        <div class="product-info">
            <p class="product-title">${nombreSeguro}</p>
            <p class="product-price">$${precioSeguro}</p>
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