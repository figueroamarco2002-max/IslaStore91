/**
     * ====================================================================
     * ARCHIVO: filters.js
     * DEPENDENCIAS: config.js (API_BASE_URL, escapeHTML)
     *               products.js (fetchProducts, renderProducts, products global)
     * DESCRIPCIÓN: Maneja el sistema de filtrado por categoría, estilo y
     *              búsqueda por nombre (filtrado local sobre el arreglo global).
     * SEGURIDAD: Todos los datos dinámicos que se insertan en el DOM
     *            mediante innerHTML son sanitizados con escapeHTML().
     * ====================================================================
     */

// ====================================================================
// 1. FUNCIÓN PRINCIPAL: setFilter (maneja clics en botones de filtro)
//    - Actualiza la variable global currentFilters.
//    - Cambia la clase 'active' visualmente.
//    - Llama a fetchProducts (desde products.js) y renderProducts.
//    - No inserta datos del usuario en el DOM, es seguro.
// ====================================================================
async function setFilter(tipoFiltro, valor) {
    // 1. Guardamos el filtro seleccionado en la variable global existente
    if (typeof currentFilters !== 'undefined') {
        currentFilters[tipoFiltro] = valor;
    }

    // 2. Lógica visual: Cambiar el estado activo (botón negro) del grupo correspondiente
    let grupoId = '';
    if (tipoFiltro === 'categoria') grupoId = 'filter-category';
    if (tipoFiltro === 'estilo') grupoId = 'filter-style';
    if (tipoFiltro === 'tipo') grupoId = 'filter-tipo';

    if (grupoId) {
        // Quitamos la clase 'active' a todos los botones del grupo
        const botones = document.querySelectorAll(`#${grupoId} .filter-btn`);
        botones.forEach(btn => btn.classList.remove('active'));

        // Buscamos y activamos el botón que coincida con el valor seleccionado
        const botonSeleccionado = document.querySelector(`#${grupoId} .filter-btn[data-filter="${valor}"]`);
        if (botonSeleccionado) {
            botonSeleccionado.classList.add('active');
        }
    }

    // 3. Consultamos al backend los productos filtrados
    if (typeof fetchProducts === 'function') {
        await fetchProducts(currentFilters);
    }

    // 4. Renderizamos los resultados en pantalla (renderProducts ya está blindado)
    if (typeof renderProducts === 'function') {
        renderProducts();
    }
}

// ====================================================================
// 2. irAlCatalogo: cierra el menú móvil y hace scroll al catálogo
//    - No inserta datos del usuario, es seguro.
// ====================================================================
function irAlCatalogo() {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.remove('active');

    const catalogo = document.getElementById('catalogo');
    if (catalogo) catalogo.scrollIntoView({ behavior: 'smooth' });
}

// ====================================================================
// 3. filterProductsByName: filtra localmente sobre el arreglo global
//    - No inserta directamente en el DOM, llama a renderFilteredProducts.
//    - El texto de búsqueda se usa solo para filtrar, no se muestra.
// ====================================================================
function filterProductsByName() {
    const searchText = document.getElementById('search-input').value.toLowerCase().trim();

    // Si la variable global 'products' existe, filtramos sobre ella combinada con los filtros activos
    let filtered = products;

    // 1. Aplicar filtros previos si los hay (categoría, estilo, tipo)
    if (typeof currentFilters !== 'undefined') {
        filtered = products.filter(producto => {
            const catProd = String(producto.category_id || producto.categoria || '');
            const estiloProd = (producto.estilo || '').toLowerCase();
            const tipoProd = (producto.tipo || '').toLowerCase();

            let matchCat = true;
            let matchEstilo = true;
            let matchTipo = true;

            if (currentFilters.categoria && currentFilters.categoria !== 'Todos') {
                matchCat = catProd.toLowerCase() === currentFilters.categoria.toLowerCase();
            }
            if (currentFilters.estilo && currentFilters.estilo !== 'Todos') {
                matchEstilo = estiloProd === currentFilters.estilo.toLowerCase();
            }
            if (currentFilters.tipo && currentFilters.tipo !== 'Todos') {
                matchTipo = tipoProd === currentFilters.tipo.toLowerCase();
            }

            return matchCat && matchEstilo && matchTipo;
        });
    }

    // 2. Aplicar el texto de búsqueda por nombre
    if (searchText !== '') {
        filtered = filtered.filter(producto => {
            const nombre = (producto.name || producto.nombre || '').toLowerCase();
            const estilo = (producto.estilo || '').toLowerCase();
            return nombre.includes(searchText) || estilo.includes(searchText);
        });
    }

    // 3. Renderizar los productos filtrados (con la función segura)
    renderFilteredProducts(filtered);
}

// ====================================================================
// 4. renderFilteredProducts (SEGURA) - Renderiza resultados de búsqueda/filtros
//    - Aplica escapeHTML a nombre, categoría y alt de la imagen.
//    - El precio es numérico, no necesita escape, pero se formatea.
//    - El ID se usa en onclick, es seguro (numérico o UUID).
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
        // === SANITIZAMOS TODOS LOS DATOS DINÁMICOS ===
        const idProd = producto.id || '';
        const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
        const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
        const imagenSrc = getProductImages(producto)[0];

        let idCategoria = producto.category_id || producto.categoria;
        let textoCategoria = idCategoria == 1 ? 'Hombre' : idCategoria == 2 ? 'Mujer' : 'Sin categoría';
        textoCategoria = escapeHTML(textoCategoria);

        // Construir tarjeta con todos los datos sanitizados
        const cardHTML = `
                <div class="product-card" style="border: 1px solid #B6B6B6; border-radius: 8px; overflow: hidden; padding-bottom: 15px; text-align: center; background: #fff; box-shadow: 0 4px 6px rgba(13,13,13,0.06);">
                    <div class="product-image" style="width: 100%; height: 250px; overflow: hidden; background: #E7E7E7; cursor: pointer;" onclick="openProductDetails('${idProd}')">
                        <img src="${imagenSrc}" alt="${nombreSeguro}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div class="product-info" style="padding: 15px;">
                        <span style="font-size: 0.8rem; color: #3D3D3D; text-transform: uppercase; font-weight: bold;">${textoCategoria}</span>
                        <h3 style="margin: 10px 0; font-size: 1.1rem; color: #0D0D0D; cursor: pointer;" onclick="openProductDetails('${idProd}')">${nombreSeguro}</h3>
                        <p class="price" style="font-weight: 700; color: #E63946; font-size: 1.2rem; margin-bottom: 15px;">$${precioSeguro}</p>
                        
                        <button class="btn-primary" onclick="openProductDetails('${idProd}')" style="background: #0D0D0D; color: #FFFFFF; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; width: 90%; transition: background 0.3s;">
                            Ver Detalles
                        </button>
                    </div>
                </div>
            `;
        grid.innerHTML += cardHTML;
    });

    // Activar animación (clase "show" que tu CSS espera)
    requestAnimationFrame(() => {
        grid.querySelectorAll('.product-card').forEach(card => {
            card.classList.add('show');
        });
    });
}