// ================= DATOS DESDE LA API =================
let products = [];

// Función para obtener productos del backend
async function fetchProducts(filters = {}) {
    try {
        // 1. Limpiamos los filtros: si el filtro es "Todos", lo ignoramos para que el backend traiga el catálogo completo
        const validFilters = {};
        for (const key in filters) {
            if (filters[key] && filters[key] !== 'Todos') {
                validFilters[key] = filters[key];
            }
        }

        // 2. Construimos los parámetros de la URL
        const queryParams = new URLSearchParams(validFilters).toString();
        const url = `http://localhost:3000/api/products${queryParams ? '?' + queryParams : ''}`;

        console.log("📍 Consultando URL:", url);

        // 3. Hacemos la petición al servidor
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar productos desde el servidor');

        const data = await response.json();
        console.log("📦 Productos recibidos de la base de datos:", data);

        products = data;
        return products;
    } catch (error) {
        console.error('❌ Error fetchProducts:', error);
        return [];
    }
}

// Función para guardar (obsoleta en local storage)
function saveProductsToStorage() {
    console.warn('saveProductsToStorage está obsoleto, usar API');
}