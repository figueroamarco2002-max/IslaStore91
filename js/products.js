// ================= DATOS DE PRODUCTOS =================
const defaultProductsData = [
    // Hombre Urbano
    { id: 1, nombre: "Camisa Oversize", precio: 35.00, categoria: "Hombre", estilo: "Urbano", tipo: "ropa" },
    { id: 2, nombre: "Chamarra Bomber", precio: 65.00, categoria: "Hombre", estilo: "Urbano", tipo: "ropa" },
    { id: 3, nombre: "Gorra 5 Paneles", precio: 22.00, categoria: "Hombre", estilo: "Urbano", tipo: "gorra" },
    { id: 4, nombre: "Reloj Analógico", precio: 120.00, categoria: "Hombre", estilo: "Urbano", tipo: "reloj" },
    // Hombre Deportivo
    { id: 5, nombre: "Playera Dry-Fit", precio: 28.00, categoria: "Hombre", estilo: "Deportivo", tipo: "ropa" },
    { id: 6, nombre: "Short con Malla", precio: 32.00, categoria: "Hombre", estilo: "Deportivo", tipo: "ropa" },
    { id: 7, nombre: "Gorra Running", precio: 20.00, categoria: "Hombre", estilo: "Deportivo", tipo: "gorra" },
    { id: 8, nombre: "Reloj Inteligente GPS", precio: 185.00, categoria: "Hombre", estilo: "Deportivo", tipo: "reloj" },
    // Mujer Urbano
    { id: 9, nombre: "Top Cropped", precio: 25.00, categoria: "Mujer", estilo: "Urbano", tipo: "ropa" },
    { id: 10, nombre: "Chamarra Mezclilla", precio: 70.00, categoria: "Mujer", estilo: "Urbano", tipo: "ropa" },
    { id: 11, nombre: "Gorra Dad-style", precio: 24.00, categoria: "Mujer", estilo: "Urbano", tipo: "gorra" },
    { id: 12, nombre: "Reloj Acero Rosa", precio: 140.00, categoria: "Mujer", estilo: "Urbano", tipo: "reloj" },
    // Mujer Deportivo
    { id: 13, nombre: "Legging Diseño", precio: 45.00, categoria: "Mujer", estilo: "Deportivo", tipo: "ropa" },
    { id: 14, nombre: "Top Deportivo", precio: 30.00, categoria: "Mujer", estilo: "Deportivo", tipo: "ropa" },
    { id: 15, nombre: "Gorra Visera", precio: 18.00, categoria: "Mujer", estilo: "Deportivo", tipo: "gorra" },
    { id: 16, nombre: "Reloj Pulsómetro", precio: 150.00, categoria: "Mujer", estilo: "Deportivo", tipo: "reloj" }
];

let products = [];

// Cargar productos de localStorage o usar por defecto
const storedProducts = localStorage.getItem('jrstore_products');

if (storedProducts) {
    products = JSON.parse(storedProducts);
} else {
    // Inicializar imágenes y guardar en localStorage por primera vez
    products = defaultProductsData.map(p => ({
        ...p,
        imagen: `https://picsum.photos/seed/${p.id + 100}/400/500`
    }));
    localStorage.setItem('jrstore_products', JSON.stringify(products));
}

// Función para guardar productos en localStorage (usada desde admin)
function saveProductsToStorage() {
    localStorage.setItem('jrstore_products', JSON.stringify(products));
}
