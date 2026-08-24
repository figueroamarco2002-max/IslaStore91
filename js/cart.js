// ================= LÓGICA DEL CARRITO =================
let cart = [];

function addToCart(id) {
    const product = products.find(p => p.id === id);
    const existItem = cart.find(item => item.id === id);

    if (existItem) {
        existItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    updateCartUI();
    showToast();
    animateBadge();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    // Update Badge Count
    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
    document.getElementById('cart-badge').textContent = totalItems;

    // Render Sidebar Items
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = '';

    let totalPrice = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted)">Tu bolsa está vacía.</p>';
    } else {
        cart.forEach(item => {
            totalPrice += (item.precio * item.qty);
            cartItemsContainer.innerHTML += `
                <div class="cart-item">
                    <img src="${item.imagen}" alt="${item.nombre}">
                    <div class="cart-item-info">
                        <h4 class="cart-item-title">${item.nombre}</h4>
                        <span class="cart-item-price">$${item.precio.toFixed(2)}</span>
                        <span class="cart-item-qty">x ${item.qty}</span>
                    </div>
                    <button class="remove-item" onclick="removeFromCart(${item.id})">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        });
    }

    // Update Total
    document.getElementById('cart-total-price').textContent = `$${totalPrice.toFixed(2)}`;
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('active');
    document.getElementById('cart-overlay').classList.toggle('active');
}
