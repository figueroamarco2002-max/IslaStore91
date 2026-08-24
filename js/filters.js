// ================= SISTEMA DE FILTRADO =================

// Estado global de filtros (defaults)
let currentFilters = { categoria: 'Todos', estilo: 'Todos', tipo: 'Todos' };

// Aplicar pre-filtro de página si existe (definido antes de cargar este script)
if (window.pageFilter) {
    if (window.pageFilter.categoria) currentFilters.categoria = window.pageFilter.categoria;
    if (window.pageFilter.estilo) currentFilters.estilo = window.pageFilter.estilo;
    if (window.pageFilter.tipo) currentFilters.tipo = window.pageFilter.tipo;
}

// Renderizado del Catálogo
function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    // Lógica combinada de filtros
    const filteredProducts = products.filter(p => {
        const matchCategory = currentFilters.categoria === 'Todos' || p.categoria === currentFilters.categoria;
        const matchStyle = currentFilters.estilo === 'Todos' || p.estilo === currentFilters.estilo;
        const matchType = currentFilters.tipo === 'Todos' || p.tipo === currentFilters.tipo;
        return matchCategory && matchStyle && matchType;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted)">No hay productos que coincidan con tu búsqueda.</p>`;
        return;
    }

    filteredProducts.forEach(product => {
        const article = document.createElement('article');
        article.className = 'product-card';

        // HTML del producto
        article.innerHTML = `
            <div class="img-container">
                <img src="${product.imagen}" alt="${product.nombre}" loading="lazy">
                <button class="btn-add-float" onclick="addToCart(${product.id})">Añadir al carrito</button>
            </div>
            <div class="product-info">
                <div class="product-tags">${product.categoria} &bull; ${product.estilo}</div>
                <h3 class="product-title">${product.nombre}</h3>
                <div class="product-price">$${product.precio.toFixed(2)}</div>
            </div>
        `;

        grid.appendChild(article);

        // Trigger animation fade-in and scale
        setTimeout(() => {
            article.classList.add('show');
        }, 50);
    });
}

// Sistema de Filtrado sin recarga
function setFilter(type, value) {
    currentFilters[type] = value;

    // Actualizar UI de botones del grupo correspondiente
    const groupMap = {
        'categoria': 'filter-category',
        'estilo': 'filter-style',
        'tipo': 'filter-type'
    };

    const groupId = groupMap[type];
    if (groupId) {
        const buttons = document.querySelectorAll(`#${groupId} .filter-btn`);
        buttons.forEach(btn => {
            if (btn.dataset.filter === value) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Actualizar enlaces del Nav si es tipo
    if (type === 'tipo') {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.querySelectorAll('a').forEach(a => {
                const text = a.textContent.toLowerCase();
                const isActive = (value === 'Todos' && text.includes('todos')) ||
                                 (value === 'ropa' && text.includes('ropa')) ||
                                 (value === 'gorra' && text.includes('gorras')) ||
                                 (value === 'reloj' && text.includes('relojes'));
                
                if (isActive) {
                    a.classList.add('active-link');
                } else {
                    a.classList.remove('active-link');
                }
            });
            // Cerrar menu mobile si está abierto
            navbar.classList.remove('active');
        }
    }

    renderProducts();
}
