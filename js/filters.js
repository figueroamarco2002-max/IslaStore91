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