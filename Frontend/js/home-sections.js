/**
 * ====================================================================
 * ARCHIVO: home-sections.js (carruseles dinámicos)
 * DEPENDENCIA: config.js (debe cargarse antes para tener escapeHTML)
 * DESCRIPCIÓN: Obtiene las secciones visibles desde /api/sections,
 *              genera dinámicamente los carruseles de productos y los
 *              inicializa respetando la visibilidad configurada.
 *              También intercala los banners de "Mujeres", Instagram
 *              y "Próxima Vez" en puntos específicos del recorrido.
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

function buildCarouselCardHTML(producto) {
    const idProd = producto.id || '';
    const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
    const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
    const imagenSrc = getProductImages(producto)[0];
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

function registerProductsGlobally(productos) {
    if (typeof products === 'undefined') return;
    productos.forEach(p => {
        if (!products.find(existing => existing.id === p.id)) {
            products.push(p);
        }
    });
}

async function initCarousel(containerId, filters) {
    const track = document.getElementById(containerId);
    if (!track) return;

    const productos = await fetchProductsFiltered(filters);
    const wrapper = track.closest('.carousel-wrapper');

    if (!productos || productos.length === 0) {
        if (wrapper) {
            wrapper.querySelectorAll('.carousel-arrow').forEach(arrow => arrow.style.display = 'none');
        }
        track.innerHTML = '<p style="padding: 1rem 3.5rem; text-align: center; width: 100%; color: #3D3D3D;">No hay productos disponibles en esta categoría todavía.</p>';
        return;
    }

    if (wrapper) {
        wrapper.querySelectorAll('.carousel-arrow').forEach(arrow => arrow.style.display = 'flex');
    }

    registerProductsGlobally(productos);
    track.innerHTML = productos.map(buildCarouselCardHTML).join('');
}

function scrollCarousel(containerId, direction) {
    const track = document.getElementById(containerId);
    if (!track) return;
    track.scrollBy({ left: direction * 260, behavior: 'smooth' });
}

function scrollToMujeres() {
    const target = document.querySelector('[data-section-key="mujeres_banner"]');
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
    }
    const container = document.getElementById('home-sections-container');
    if (container) container.scrollIntoView({ behavior: 'smooth' });
}

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

async function fetchSectionSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        if (!response.ok) throw new Error('Error al cargar configuración de secciones');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetchSectionSettings:', error);
        return {};
    }
}

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
            </div>
            <button class="carousel-arrow right" aria-label="Siguiente" onclick="scrollCarousel('${carouselId}', 1)">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    </section>
    `;
}

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

async function fetchProximaVez() {
    try {
        const response = await fetch(`${API_BASE_URL}/proxima-vez`);
        if (!response.ok) throw new Error('Error al cargar Próxima Vez');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetchProximaVez:', error);
        return null;
    }
}

function scrollProximaVez(direction) {
    const track = document.getElementById('proxima-vez-track');
    if (!track) return;
    track.scrollBy({ left: direction * 280, behavior: 'smooth' });
}

function buildProximaVezBannerHTML(data) {
    if (!data || !data.banner_visible || !data.images || data.images.length === 0) {
        return '';
    }

    const title = escapeHTML(data.title || 'Próxima Vez');
    const subtitle = escapeHTML(data.subtitle || '');

    const cardsHTML = data.images.map(img => `
        <div class="pv-card">
            <img src="${escapeHTML(img.image_url)}" alt="Próxima colección" loading="lazy">
            <div class="pv-card-overlay">
                <i class="fa-solid fa-clock"></i>
                <span>Muy pronto</span>
            </div>
        </div>
    `).join('');

    return `
    <section class="proxima-vez-section" data-section-key="proxima_vez_banner">
        <div class="proxima-vez-header">
            <div class="proxima-vez-badge">
                <i class="fa-solid fa-clock"></i>
                Próximamente
            </div>
            <h2 class="proxima-vez-title">${title}</h2>
            ${subtitle ? `<p class="proxima-vez-subtitle">${subtitle}</p>` : ''}
        </div>
        <div class="proxima-vez-carousel-wrapper">
            <button class="pv-arrow left" aria-label="Anterior" onclick="scrollProximaVez(-1)">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="proxima-vez-track" id="proxima-vez-track">
                ${cardsHTML}
            </div>
            <button class="pv-arrow right" aria-label="Siguiente" onclick="scrollProximaVez(1)">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
    </section>
    `;
}

async function initDynamicSections() {
    const container = document.getElementById('home-sections-container');
    if (!container) return;

    // Además de secciones/Próxima Vez/configuración, pedimos los productos
    // de mujer YA FILTRADOS (el backend usa ILIKE, así que no importan
    // mayúsculas/minúsculas) — así confirmamos que además de estar
    // "visible" la sección, hay contenido real detrás. El banner de
    // Instagram no depende de nada de esto: solo de su propio interruptor.
    const [sections, proximaVezData, sectionSettings, productosMujer] = await Promise.all([
        fetchSections(),
        fetchProximaVez(),
        fetchSectionSettings(),
        fetchProductsFiltered({ categoria: 'mujer' })
    ]);

    const visibleSections = sections.filter(s => s.visible !== false);

    if (visibleSections.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem;">No hay secciones disponibles.</p>';
        return;
    }

    const mujeresBannerHabilitado = sectionSettings.mujeres_banner !== false;
    const igBannerHabilitado = sectionSettings.ig_banner !== false;

    const hayMujerVisible = visibleSections.some(s => String(s.category).toLowerCase() === 'mujer');

    // Contenido real: al menos un producto que respalde la sección, no solo
    // el flag "visible". Si desactivas todos los productos de mujer pero
    // te olvidas de apagar la sección/el interruptor, el banner igual se
    // oculta solo.
    const hayProductoDeMujer = Array.isArray(productosMujer) && productosMujer.length > 0;

    const mostrarWomenBanner = mujeresBannerHabilitado && hayMujerVisible && hayProductoDeMujer;
    // El banner de Instagram es puramente decorativo: se muestra o se
    // oculta según su propio interruptor, sin depender de secciones,
    // estilos ni productos.
    const mostrarIgBanner = igBannerHabilitado;

    let womenBannerInserted = false;
    let igBannerInserted = false;
    let html = '';

    visibleSections.forEach(section => {
        const cat = String(section.category).toLowerCase();
        const style = String(section.style).toLowerCase();
        const type = String(section.product_type).toLowerCase();

        if (mostrarWomenBanner && !womenBannerInserted && cat === 'mujer') {
            html += buildWomenBannerHTML();
            womenBannerInserted = true;
        }

        html += buildSectionHTML(section);

        if (mostrarIgBanner && !igBannerInserted && style === 'urbano' && type === 'gorra') {
            html += buildIgBannerHTML();
            igBannerInserted = true;
        }
    });

    // El banner de Instagram no depende de que exista una sección de
    // gorras urbano: si el interruptor está activo pero no hubo dónde
    // insertarlo "en contexto", se agrega igual al final.
    if (mostrarIgBanner && !igBannerInserted) {
        html += buildIgBannerHTML();
    }

    html += buildProximaVezBannerHTML(proximaVezData);

    container.innerHTML = html;

    const pvSection = container.querySelector('.proxima-vez-section');
    if (pvSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    pvSection.classList.add('pv-visible');
                    observer.disconnect();
                }
            });
        }, { threshold: 0.15 });
        observer.observe(pvSection);
    }

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

window.addEventListener('DOMContentLoaded', () => {
    initDynamicSections();
});