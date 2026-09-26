/**
 * ====================================================================
 * ARCHIVO: filters.js
 * DEPENDENCIAS: config.js (API_BASE_URL, escapeHTML)
 *               products.js (fetchProducts, renderProducts, products global)
 * DESCRIPCIÓN: Maneja el sistema de filtrado por categoría, estilo y
 *              búsqueda por nombre (filtrado local sobre el arreglo global).
 *              También construye dinámicamente los botones de filtro a
 *              partir de /api/categories y /api/styles, mostrando solo
 *              los valores que tienen al menos un producto cargado.
 * SEGURIDAD: Todos los datos dinámicos que se insertan en el DOM
 *            mediante innerHTML son sanitizados con escapeHTML().
 * ====================================================================
 */

async function setFilter(tipoFiltro, valor) {
    if (typeof currentFilters !== 'undefined') {
        currentFilters[tipoFiltro] = valor;
    }

    let grupoId = '';
    if (tipoFiltro === 'categoria') grupoId = 'filter-category';
    if (tipoFiltro === 'estilo') grupoId = 'filter-style';
    if (tipoFiltro === 'tipo') grupoId = 'filter-tipo';

    if (grupoId) {
        document.querySelectorAll(`#${grupoId} .filter-btn`).forEach(btn =>
            btn.classList.remove('active')
        );
        const botonSeleccionado = document.querySelector(
            `#${grupoId} .filter-btn[data-filter="${valor}"]`
        );
        if (botonSeleccionado) botonSeleccionado.classList.add('active');
    }

    if (typeof fetchProducts === 'function') {
        await fetchProducts(currentFilters);
    }
    if (typeof renderProducts === 'function') {
        renderProducts();
    }
}

// ====================================================================
// 1. setFilters — aplica VARIOS filtros de una vez con una sola petición
// Evita el race condition de llamar setFilter múltiples veces seguidas
// (cada setFilter hace su propio fetch + render, y las respuestas se
// pisan entre sí).
//
// @param {Object} filtros - ej: { categoria: 'Hombre', tipo: 'ropa' }
// ====================================================================
async function setFilters(filtros) {
    // 1. Guardar todos los filtros de una vez
    if (typeof currentFilters !== 'undefined') {
        Object.assign(currentFilters, filtros);
    }

    // 2. Actualizar el estado visual de los botones afectados
    const grupoPorFiltro = {
        categoria: 'filter-category',
        estilo: 'filter-style',
        tipo: 'filter-tipo'
    };

    Object.keys(filtros).forEach(nombreFiltro => {
        const grupoId = grupoPorFiltro[nombreFiltro];
        if (!grupoId) return;

        const valor = filtros[nombreFiltro];

        document.querySelectorAll(`#${grupoId} .filter-btn`).forEach(btn =>
            btn.classList.remove('active')
        );
        const botonSeleccionado = document.querySelector(
            `#${grupoId} .filter-btn[data-filter="${valor}"]`
        );
        if (botonSeleccionado) botonSeleccionado.classList.add('active');
    });

    // 3. UNA sola petición al backend con todos los filtros aplicados
    if (typeof fetchProducts === 'function') {
        await fetchProducts(currentFilters);
    }

    // 4. UNA sola renderizada
    if (typeof renderProducts === 'function') {
        renderProducts();
    }
}

// ====================================================================
// 2. irAlCatalogo — cierra el menú móvil y hace scroll al catálogo
// ====================================================================
function irAlCatalogo() {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.remove('active');

    const catalogo = document.getElementById('catalogo');
    if (catalogo) catalogo.scrollIntoView({ behavior: 'smooth' });
}

// ====================================================================
// 3. filterProductsByName — filtra localmente sobre el arreglo global
//    Combina los filtros activos (categoría, estilo, tipo) con el texto
//    de búsqueda por nombre/estilo. Llama a renderFilteredProducts.
//
//    IMPORTANTE: los productos traen `category_name` (texto, ej. "Hombre")
//    y `category_id` (número). Comparamos contra `category_name` porque
//    los botones de filtro usan el nombre, no el id.
// ====================================================================
function filterProductsByName() {
    const searchText = document.getElementById('search-input').value.toLowerCase().trim();

    let filtered = products;

    // 1. Aplicar filtros previos (categoría, estilo, tipo)
    if (typeof currentFilters !== 'undefined') {
        filtered = products.filter(producto => {
            const catProd = (producto.category_name || '').toLowerCase().trim();
            const estiloProd = (producto.estilo || '').toLowerCase().trim();
            const tipoProd = (producto.tipo || '').toLowerCase().trim();

            const catFiltro = (currentFilters.categoria || 'Todos').toLowerCase();
            const estiloFiltro = (currentFilters.estilo || 'Todos').toLowerCase();
            const tipoFiltro = (currentFilters.tipo || 'Todos').toLowerCase();

            if (catFiltro !== 'todos' && catProd !== catFiltro) return false;
            if (estiloFiltro !== 'todos' && estiloProd !== estiloFiltro) return false;
            if (tipoFiltro !== 'todos' && tipoProd !== tipoFiltro) return false;

            return true;
        });
    }

    // 2. Aplicar el texto de búsqueda por nombre o estilo
    if (searchText !== '') {
        filtered = filtered.filter(producto => {
            const nombre = (producto.name || producto.nombre || '').toLowerCase();
            const estilo = (producto.estilo || '').toLowerCase();
            return nombre.includes(searchText) || estilo.includes(searchText);
        });
    }

    // 3. Renderizar
    renderFilteredProducts(filtered);
}

// ====================================================================
// 4. renderFilteredProducts — renderiza resultados de búsqueda/filtros
//    Misma tarjeta que renderProducts de products.js, para que el
//    catálogo se vea consistente independientemente de cómo se llegó
//    a los productos (filtro, búsqueda, o carga inicial).
// ====================================================================
function renderFilteredProducts(arrayProductos) {
    let grid = document.getElementById('product-grid') || document.querySelector('.product-grid');
    if (!grid) return;

    if (!arrayProductos || arrayProductos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #3D3D3D; padding: 40px; font-size: 1.1rem;">No se encontraron productos que coincidan con tu búsqueda.</p>';
        return;
    }

    grid.innerHTML = '';

    arrayProductos.forEach(producto => {
        // === SANITIZACIÓN ===
        const idProd = producto.id || '';
        const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
        const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
        const imagenSrc = getProductImages(producto)[0];

        const descRaw = producto.description || producto.descripcion || '';
        const descripcionSegura = escapeHTML(descRaw);

        // Badge superior: tipo de producto ("ropa" → "Ropa")
        const tipoRaw = (producto.tipo || '').trim();
        const tipoLabel = tipoRaw
            ? tipoRaw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : 'Producto';
        const tipoSeguro = escapeHTML(tipoLabel);

        // Badge inferior: categoría ("Hombre" / "Mujer" / nombre real)
        let categoriaRaw = producto.category_name || '';
        if (!categoriaRaw) {
            const idCat = producto.category_id || producto.categoria;
            categoriaRaw = idCat == 1 ? 'Hombre' : idCat == 2 ? 'Mujer' : '';
        }
        const categoriaSegura = escapeHTML(categoriaRaw);

        // === CONSTRUCCIÓN DE LA TARJETA ===
        const cardHTML = `
            <div class="product-card" style="border: 1px solid #B6B6B6; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(13,13,13,0.06); display: flex; flex-direction: column;">
                <div class="product-image" style="position: relative; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; background: #E7E7E7; cursor: pointer;" onclick="openProductDetails('${idProd}')">
                    <img src="${imagenSrc}" alt="${nombreSeguro}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">

                    <!-- Badges apilados: tipo arriba, categoría abajo -->
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
                    <h3 style="margin: 0; font-size: 1.05rem; color: #0D0D0D; font-weight: 700; line-height: 1.3; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" onclick="openProductDetails('${idProd}')">
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
        grid.innerHTML += cardHTML;
    });

    requestAnimationFrame(() => {
        grid.querySelectorAll('.product-card').forEach(card => card.classList.add('show'));
    });
}

// ====================================================================
// 5. FILTROS DINÁMICOS — construye los botones de categoría y estilo
//    a partir de /api/categories y /api/styles, mostrando solo aquellos
//    valores que tienen al menos un producto real.
//
//    Se ejecuta una vez al cargar la página. Si el admin agrega un
//    estilo nuevo y le carga productos, al recargar aparece solo. Si
//    borra todos los productos de un estilo, el botón desaparece.
// ====================================================================

/**
 * Helper: genera los botones dentro de un contenedor. Usa
 * addEventListener en vez de onclick inline para evitar problemas
 * de escapeo cuando el valor tiene caracteres especiales.
 *
 * @param {HTMLElement} container - el <div> donde van los botones
 * @param {string} labelTodos - texto del botón "todos" ("Todas", "Cualquier Estilo")
 * @param {string} valorTodos - valor del filtro para "todos" (siempre 'Todos')
 * @param {string} filtroNombre - 'categoria' o 'estilo'
 * @param {Array} items - [{key, label}, ...] de /api/categories o /api/styles
 * @param {Set<string>} valoresVivos - claves (lowercase) con al menos un producto
 */
function renderFilterButtons(container, labelTodos, valorTodos, filtroNombre, items, valoresVivos) {
    const disponibles = items.filter(item =>
        valoresVivos.has((item.key || '').toLowerCase())
    );

    container.innerHTML = '';

    // Botón "todos" (siempre primero, activo)
    const btnTodos = document.createElement('button');
    btnTodos.className = 'filter-btn active';
    btnTodos.dataset.filter = valorTodos;
    btnTodos.textContent = labelTodos;
    btnTodos.addEventListener('click', () => setFilter(filtroNombre, valorTodos));
    container.appendChild(btnTodos);

    // Botones dinámicos
    disponibles.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = item.key;
        btn.textContent = item.label;
        btn.addEventListener('click', () => setFilter(filtroNombre, item.key));
        container.appendChild(btn);
    });
}

/**
 * Carga categorías, estilos y productos en paralelo, cruza los datos
 * para saber cuáles tienen productos reales, y renderiza los botones.
 * Si algo falla, se conservan los botones placeholder que estén en el HTML.
 */
async function initDynamicFilters() {
    const containerStyle = document.getElementById('filter-style');
    const containerCategory = document.getElementById('filter-category');
    if (!containerStyle && !containerCategory) return; // no estamos en el catálogo

    try {
        const [stylesRes, categoriesRes, productsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/styles`),
            fetch(`${API_BASE_URL}/categories`),
            fetch(`${API_BASE_URL}/products`)
        ]);

        const styles = stylesRes.ok ? await stylesRes.json() : [];
        const categories = categoriesRes.ok ? await categoriesRes.json() : [];
        const products = productsRes.ok ? await productsRes.json() : [];

        // Sets de valores que tienen al menos un producto real
        const estilosVivos = new Set();
        const categoriasVivas = new Set();

        products.forEach(p => {
            const estilo = (p.estilo || '').trim().toLowerCase();
            const categoria = (p.category_name || '').trim().toLowerCase();
            if (estilo) estilosVivos.add(estilo);
            if (categoria) categoriasVivas.add(categoria);
        });

        if (containerStyle && Array.isArray(styles) && styles.length > 0) {
            renderFilterButtons(
                containerStyle,
                'Cualquier Estilo',
                'Todos',
                'estilo',
                styles.map(s => ({ key: s.key, label: s.label })),
                estilosVivos
            );
        }

        if (containerCategory && Array.isArray(categories) && categories.length > 0) {
            renderFilterButtons(
                containerCategory,
                'Todas',
                'Todos',
                'categoria',
                categories.map(c => ({ key: c.name, label: c.name })),
                categoriasVivas
            );
        }
    } catch (error) {
        console.error('Error al cargar filtros dinámicos:', error);
        // Fallback: se conservan los botones placeholder del HTML.
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicFilters);
} else {
    initDynamicFilters();
}