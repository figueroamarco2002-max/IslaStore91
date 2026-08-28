// ================= SISTEMA DE FILTRADO =================

// Función principal para manejar los clics en los botones de filtro
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

    // 4. Renderizamos los resultados en pantalla para evitar pantallas en blanco
    if (typeof renderProducts === 'function') {
        renderProducts();
    }
}
// Cierra el menú móvil y lleva al usuario hasta el catálogo filtrado
function irAlCatalogo() {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.remove('active');

    const catalogo = document.getElementById('catalogo');
    if (catalogo) catalogo.scrollIntoView({ behavior: 'smooth' });
}
// ================= BUSCADOR EN TIEMPO REAL =================
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

    // 3. Renderizar los productos filtrados temporalmente en pantalla
    renderFilteredProducts(filtered);
}

// Función auxiliar para pintar resultados de búsqueda sin romper la estructura
function renderFilteredProducts(arrayProductos) {
    let grid = document.getElementById('product-grid') || document.querySelector('.product-grid');
    if (!grid) return;

    if (!arrayProductos || arrayProductos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666; padding: 40px; font-size: 1.1rem;">No se encontraron productos que coincidan con tu búsqueda.</p>';
        return;
    }

    grid.innerHTML = '';

    arrayProductos.forEach(producto => {
        const idProd = producto.id || '';
        const nombreProducto = producto.name || producto.nombre || 'Producto sin nombre';
        const precioProducto = parseFloat(producto.price || producto.precio || 0).toFixed(2);
        const imagenSrc = producto.imagen || producto.image_url || 'https://placehold.co/300x400/eeeeee/999999';
        
        let idCategoria = producto.category_id || producto.categoria;
        let textoCategoria = idCategoria == 1 ? 'Hombre' : idCategoria == 2 ? 'Mujer' : 'Sin categoría';

        const cardHTML = `
            <div class="product-card" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; padding-bottom: 15px; text-align: center; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div class="product-image" style="width: 100%; height: 250px; overflow: hidden; background: #f9f9f9; cursor: pointer;" onclick="openProductDetails('${idProd}')">
                    <img src="${imagenSrc}" alt="${nombreProducto}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="product-info" style="padding: 15px;">
                    <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; font-weight: bold;">${textoCategoria}</span>
                    <h3 style="margin: 10px 0; font-size: 1.1rem; color: #333; cursor: pointer;" onclick="openProductDetails('${idProd}')">${nombreProducto}</h3>
                    <p class="price" style="font-weight: 600; color: #e65c00; font-size: 1.2rem; margin-bottom: 15px;">$${precioProducto}</p>
                    
                    <button class="btn-primary" onclick="openProductDetails('${idProd}')" style="background: #333; color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; width: 90%; transition: background 0.3s;">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}