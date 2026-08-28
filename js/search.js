// ================= BÚSQUEDA EN TIEMPO REAL =================
let searchDebounceTimer = null;

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

function buildSearchResultItem(producto) {
    const idProd = producto.id || '';
    const nombre = producto.name || producto.nombre || 'Producto sin nombre';
    const precio = parseFloat(producto.price || producto.precio || 0).toFixed(2);

    return `
    <div class="search-result-item" onclick="seleccionarResultadoBusqueda('${idProd}')">
        <span class="name">${nombre}</span>
        <span class="price">$${precio}</span>
    </div>
  `;
}

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

function onSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(manejarBusquedaEnVivo, 300);
}

function buildSearchGridCardHTML(producto) {
    const idProd = producto.id || '';
    const nombre = producto.name || producto.nombre || 'Producto sin nombre';
    const precio = parseFloat(producto.price || producto.precio || 0).toFixed(2);
    const imagen = producto.imagen || producto.image_url || 'https://placehold.co/300x400/eeeeee/999999';

    return `
    <div class="search-result-card show" onclick="openProductDetails('${idProd}')">
        <div class="img-container">
            <img src="${imagen}" alt="${nombre}">
        </div>
        <div class="product-info">
            <p class="product-title">${nombre}</p>
            <p class="product-price">$${precio}</p>
        </div>
    </div>
  `;
}

async function ejecutarBusquedaCompleta(event) {
    if (event) event.preventDefault();

    const termino = document.getElementById('search-input').value.trim();
    if (termino.length === 0) return;

    const resultados = await fetchProductsFiltered({ search: termino });
    registerProductsGlobally(resultados);

    const section = document.getElementById('search-results-section');
    const grid = document.getElementById('search-results-grid');
    const titulo = document.getElementById('search-results-title');

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