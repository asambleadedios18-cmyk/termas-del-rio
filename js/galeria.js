/* ==========================================================
   Termas del Río · Galería data-driven
   Las fotos se leen de data/galeria.json. Los filtros ocultan
   tarjetas sin recargar; el lightbox/carrusel vive en main.js.
   ========================================================== */
(function (w, d) {
    'use strict';

    var T = w.TermasData;
    var filtros = d.getElementById('gallery-filters');
    var grid = d.getElementById('gallery-grid');
    var count = d.getElementById('gallery-count');
    var empty = d.getElementById('gallery-empty');
    if (!T || !filtros || !grid) return;

    function esc(v) { return T.escapeHtml(v); }

    function renderFiltros(secciones) {
        filtros.innerHTML = secciones.map(function (s, i) {
            return '<button type="button" data-seccion="' + esc(s.id) + '" class="' + (i === 0 ? 'is-active' : '') + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + esc(s.nombre) + '</button>';
        }).join('');
    }

    function tarjeta(foto, destacada) {
        var archivo = T.ruta(foto.archivo);
        return '<a class="gallery__item reveal' + (destacada ? ' gallery__item--destacada' : '') + '"' +
            ' href="' + esc(archivo) + '"' +
            ' data-lightbox data-caption="' + esc(foto.titulo) + '">' +
            '<img src="' + esc(archivo) + '" alt="' + esc(foto.titulo) + '" loading="lazy" width="' + (foto.ancho || 1200) + '" height="' + (foto.alto || 900) + '">' +
            '<span class="gallery__caption">' + esc(foto.titulo) + '</span>' +
        '</a>';
    }

    function aplicarFiltro(id, secciones, fotos) {
        var lista = id === 'todas' ? fotos : fotos.filter(function (f) { return f.seccion === id; });
        var seccion = null;
        secciones.forEach(function (s) { if (s.id === id) seccion = s; });

        grid.innerHTML = lista.map(function (f, i) { return tarjeta(f, i === 0); }).join('');

        if (!lista.length) {
            var nota = seccion && seccion.nota ? seccion.nota : 'Todavía no hay fotografías reales de esta sección.';
            grid.innerHTML = '<div class="gallery__empty"><div class="placeholder placeholder--water" role="img" aria-label="Sin fotografías disponibles"></div>' +
                '<p>' + esc(nota) + '</p></div>';
        }

        if (count) {
            count.textContent = lista.length
                ? 'Mostrando ' + lista.length + ' ' + (lista.length === 1 ? 'fotografía' : 'fotografías') + (id === 'todas' ? ' de Termas del Río.' : ' de ' + (seccion ? seccion.nombre : id) + '.')
                : 'Sin fotografías disponibles en esta sección.';
        }

        Array.prototype.forEach.call(filtros.querySelectorAll('button'), function (b) {
            var activo = b.getAttribute('data-seccion') === id;
            b.classList.toggle('is-active', activo);
            b.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });

        if (w.TermasUI) w.TermasUI.observar(grid, '.reveal');
        if (empty) empty.hidden = true;
    }

    T.listo().then(function () {
        var g = T.galeria();
        if (!g || !g.secciones || !g.fotos) throw new Error('sin galería');
        var secciones = g.secciones;
        var fotos = g.fotos;

        renderFiltros(secciones);
        filtros.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-seccion]');
            if (!b) return;
            aplicarFiltro(b.getAttribute('data-seccion'), secciones, fotos);
        });

        aplicarFiltro('todas', secciones, fotos);
        T.aplicarEnlaces();
    }).catch(function () {
        grid.innerHTML = '<div class="gallery__empty"><p>No se pudo cargar la galería. Intenta recargar la página.</p></div>';
        if (empty) empty.hidden = true;
    });
})(window, document);
