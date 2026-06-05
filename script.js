// Agrega la clase "scrolled" al navbar cuando el usuario scrollea
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');

    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Modo oscuro / claro
const btnTema = document.getElementById('btn-tema');

btnTema.addEventListener('click', function() {
    document.body.classList.toggle('oscuro');

    // Cambia el ícono según el modo
    if (document.body.classList.contains('oscuro')) {
        btnTema.textContent = '☀️';
    } else {
        btnTema.textContent = '🌙';
    }
});

// Animaciones al scrollear
const secciones = document.querySelectorAll('.oculto');

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

secciones.forEach(function(seccion) {
    observer.observe(seccion);
});