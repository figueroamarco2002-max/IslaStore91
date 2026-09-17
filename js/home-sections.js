/**
 * ====================================================================
 * ARCHIVO: home-sections.js (carruseles dinámicos)
 * DEPENDENCIA: config.js (debe cargarse antes para tener escapeHTML)
 * DESCRIPCIÓN: Obtiene las secciones visibles desde /api/sections,
 *              genera dinámicamente los carruseles de productos y los
 *              inicializa respetando la visibilidad configurada.
 *              También intercala los banners de "Mujeres" e Instagram
 *              en puntos específicos del recorrido, en vez de tenerlos
 *              fijos en el HTML.
 * SEGURIDAD: Todos los datos dinámicos se sanitizan con escapeHTML().
 * ====================================================================
 */

// ====================================================================
// 1. OBTENER PRODUCTOS FILTRADOS
// ====================================================================
async function fetchProductsFiltered(filters = {}) {
    try {
        const validFilters = {};
        for (const key in filters) {
            if (filters[key] && filters[key] !== 'Todos') validFilters[key] = filters[key];
        }
        const queryParams = new URLSearchParams(validFilters).toString();
        const url = `${API_BASE_URL}/products${queryParams ? '?' + queryParams : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar productos');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetchProductsFiltered:', error);
        return [];
    }
}

// ====================================================================
// 2. CONSTRUIR TARJETA DE PRODUCTO (SEGURA)
// ====================================================================
function buildCarouselCardHTML(producto) {
    const idProd = producto.id || '';
    const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
    const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
    const imagenSrc = producto.imagen || producto.image_url || 'https://placehold.co/300x400/eeeeee/999999';
    const altSeguro = nombreSeguro;

    return `
    <div class="product-card show" onclick="openProductDetails('${idProd}')">
        <div class="img-container">
            <img src="${imagenSrc}" alt="${altSeguro}">
        </div>
        <div class="product-info">
            <h3 class="product-title">${nombreSeguro}</h3>
            <p class="product-price">$${precioSeguro}</p>
        </div>
    </div>
  `;
}

// ====================================================================
// 3. REGISTRAR PRODUCTOS EN EL ARREGLO GLOBAL
// ====================================================================
function registerProductsGlobally(productos) {
    if (typeof products === 'undefined') return;
    productos.forEach(p => {
        if (!products.find(existing => existing.id === p.id)) {
            products.push(p);
        }
    });
}

// ====================================================================
// 4. INICIALIZAR UN CARRUSEL
// ====================================================================
async function initCarousel(containerId, filters) {
    const track = document.getElementById(containerId);
    if (!track) return;

    const productos = await fetchProductsFiltered(filters);
    if (!productos || productos.length === 0) {
        track.innerHTML = '<p style="padding: 1rem; color: #999;">No hay productos disponibles en esta categoría todavía.</p>';
        return;
    }

    registerProductsGlobally(productos);
    track.innerHTML = productos.map(buildCarouselCardHTML).join('');
}

// ====================================================================
// 5. DESPLAZAR CARRUSEL
// ====================================================================
function scrollCarousel(containerId, direction) {
    const track = document.getElementById(containerId);
    if (!track) return;
    track.scrollBy({ left: direction * 260, behavior: 'smooth' });
}

// ====================================================================
// 6. SCROLL SUAVE A LA SECCIÓN DE MUJERES
// ====================================================================
function scrollToMujeres() {
    const target = document.querySelector('[data-section-key="mujeres_banner"]');
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    // Respaldo: si el banner no se llegó a insertar (no había secciones de
    // mujer visibles), se hace scroll al contenedor completo.
    const container = document.getElementById('home-sections-container');
    if (container) container.scrollIntoView({ behavior: 'smooth' });
}

// ====================================================================
// 7. OBTENER SECCIONES DESDE EL BACKEND
// ====================================================================
async function fetchSections() {
    try {
        const response = await fetch(`${API_BASE_URL}/sections`);
        if (!response.ok) throw new Error('Error al cargar secciones');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetchSections:', error);
        return [];
    }
}

// ====================================================================
// 8. GENERAR HTML DE UNA SECCIÓN DE CARRUSEL
// ====================================================================
function buildSectionHTML(section) {
    const categoryLabel = section.category === 'hombre' ? 'Hombre' : section.category === 'mujer' ? 'Mujer' : section.category;
    const styleLabel = section.style ? (section.style === 'urbano' ? 'Urbano' : section.style === 'deportivo' ? 'Deportivo' : section.style) : '';
    const typeLabel = section.product_type === 'ropa' ? 'Ropa' : section.product_type === 'gorra' ? 'Gorras' : section.product_type === 'reloj' ? 'Relojes' : section.product_type;

    let title = '';
    if (styleLabel) {
        title = `${typeLabel} ${styleLabel}`;
    } else {
        title = typeLabel;
    }
    if (categoryLabel) {
        title = `${title} ${categoryLabel}`;
    }

    const carouselId = `carousel-${section.id}`;

    return `
    <section class="category-section" data-section-id="${section.id}">
        <div class="category-header">
            <h2>${escapeHTML(title)}</h2>
        </div>
        <div class="carousel-wrapper">
            <button class="carousel-arrow left" aria-label="Anterior" onclick="scrollCarousel('${carouselId}', -1)">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="carousel-track" id="${carouselId}">
                <!-- Se inyecta vía JS -->
            </div>
            <button class="carousel-arrow right" aria-label="Siguiente" onclick="scrollCarousel('${carouselId}', 1)">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    </section>
    `;
}

// ====================================================================
// 8.1 HTML DE LOS BANNERS INTERCALADOS (antes vivían fijos en index.html)
// ====================================================================
function buildWomenBannerHTML() {
    return `
    <section class="women-banner" data-section-key="mujeres_banner">
        <div class="women-banner-content">
            <h2>De las Mujeres</h2>
            <button class="btn-outline-white" onclick="scrollToMujeres()">Ver Todo</button>
        </div>
    </section>
    `;
}

function buildIgBannerHTML() {
    return `
    <section class="ig-banner" data-section-key="ig_banner">
        <a href="https://www.instagram.com/JrStore" target="_blank" rel="noopener noreferrer" class="ig-handle-btn">
            <i class="fa-brands fa-instagram"></i> @JrStore
        </a>
        <h2>El estilo se vive,<br>se comparte y <span class="accent">se inspira</span></h2>
    </section>
    `;
}

// ====================================================================
// 9. INICIALIZAR TODAS LAS SECCIONES DINÁMICAS (+ banners intercalados)
// ====================================================================
async function initDynamicSections() {
    const container = document.getElementById('home-sections-container');
    if (!container) return;

    const sections = await fetchSections();
    const visibleSections = sections.filter(s => s.visible !== false);

    if (visibleSections.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem;">No hay secciones disponibles.</p>';
        return;
    }

    let womenBannerInserted = false;
    let igBannerInserted = false;
    let html = '';

    visibleSections.forEach(section => {
        // El banner "De las Mujeres" va justo antes de la primera sección
        // cuya categoría sea 'mujer', sin importar el orden en que llegaron.
        if (!womenBannerInserted && section.category === 'mujer') {
            html += buildWomenBannerHTML();
            womenBannerInserted = true;
        }

        html += buildSectionHTML(section);

        // El banner de Instagram va justo después de la primera sección de
        // "Gorras Urbano" (de cualquier categoría, la que aparezca primero).
        if (!igBannerInserted && section.style === 'urbano' && section.product_type === 'gorra') {
            html += buildIgBannerHTML();
            igBannerInserted = true;
        }
    });

    // Si no hay secciones de mujer o de gorras urbanas visibles hoy, los
    // banners no desaparecen silenciosamente: se agregan al final.
    if (!womenBannerInserted) html += buildWomenBannerHTML();
    if (!igBannerInserted) html += buildIgBannerHTML();

    container.innerHTML = html;

    visibleSections.forEach(section => {
        const carouselId = `carousel-${section.id}`;
        const filters = {
            categoria: section.category,
            tipo: section.product_type
        };
        if (section.style) {
            filters.estilo = section.style;
        }
        initCarousel(carouselId, filters);
    });
}

// ====================================================================
// 10. INICIALIZAR AL CARGAR LA PÁGINA
// ====================================================================
window.addEventListener('DOMContentLoaded', () => {
    initDynamicSections();
});