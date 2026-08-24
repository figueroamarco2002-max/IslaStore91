// ================= EFECTOS UX =================

// Menú Hamburguesa
function toggleMenu() {
    document.getElementById('navbar').classList.toggle('active');
}

// Animación del Badge del carrito
function animateBadge() {
    const badge = document.getElementById('cart-badge');
    badge.classList.remove('bounce');
    void badge.offsetWidth; // Trigger reflow
    badge.classList.add('bounce');
}

// Notificación Toast
function showToast() {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ¡Añadido a la bolsa!`;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ================= INICIALIZACIÓN =================
window.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartUI();
});
