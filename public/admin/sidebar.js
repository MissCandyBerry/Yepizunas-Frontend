document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar el nombre exacto usando la llave de tu Local Storage
    const adminName = localStorage.getItem('nombre') || 'Administrador';

    // 2. Plasmar el nombre y la inicial en el HTML
    const nameDisplay = document.getElementById('adminNameDisplay');
    const initialsDisplay = document.getElementById('adminInitials');
    
    if (nameDisplay) {
        nameDisplay.textContent = adminName;
    }
    if (initialsDisplay) {
        // Agarra la primera letra (la "G" de Gallo)
        initialsDisplay.textContent = adminName.charAt(0).toUpperCase();
    }

    // 3. Funcionalidad del botón Cerrar Sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            // Aniquilamos todo el localStorage sin piedad (borra el token, el nombre, todo)
            localStorage.clear(); 
            
            // Redirigimos al inicio
            window.location.href = '../homepage.html';
        });
    }
});