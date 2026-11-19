/* ==========================================================
   Termas del Río · Portada data-driven
   Renderiza experiencias, galería, datos rápidos y FAQ desde
   data/*.json. No duplica información comercial en el HTML.
   ========================================================== */
(function (w, d) {
    'use strict';

    function esc(v) { return w.TermasData.escapeHtml(v); }
    function ruta(v) { return w.TermasData.ruta(v); }

    function precio(s) {
        if (!s.precios || !s.precios.length) return 'Consultar';
        return s.precios[0].valor || 'Consultar';
    }

    function fotoPrincipal(s) {
        return s.fotos && s.fotos.estado === 'reales' ? s.fotos.principal : null;
    }

    function renderFacts(sitio) {
        var box = d.getElementById('facts-grid');
        if (!box || !sitio.datos_rapidos) return;
        box.innerHTML = sitio.datos_rapidos.map(function (f) {
            return '<div class="fact reveal"><strong>' + esc(f.valor) + '</strong><span>' + esc(f.etiqueta) + '</span></div>';
        }).join('');
    }

    function renderExperiencias(servicios) {
        var box = d.getElementById('experiencias-grid');
        if (!box) return;
        box.innerHTML = servicios.map(function (s, i) {
            var foto = fotoPrincipal(s);
            var media = foto
                ? '<a class="exp-card__media" href="' + esc(ruta(s.url)) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(ruta(foto)) + '" alt="" loading="lazy" width="1300" height="868"></a>'
                : '<div class="exp-card__media exp-card__media--vacio" aria-hidden="true"><span>' + esc(s.nombre_corto) + '</span></div>';
            var tags = (s.caracteristicas || []).slice(0, 3).map(function (c) {
                return '<li>' + esc(c.nombre) + '</li>';
            }).join('');
            var mensaje = 'Hola, quisiera información y disponibilidad de ' + s.nombre + ' en Termas del Río';
            return '<article class="exp-card reveal" style="--delay:' + (i * 70) + 'ms">' +
                media +
                '<div class="exp-card__body">' +
                    '<p class="exp-card__eyebrow">Experiencia ' + String(i + 1).padStart(2, '0') + '</p>' +
                    '<h3>' + esc(s.nombre) + '</h3>' +
                    '<p class="exp-card__text">' + esc(s.resumen) + '</p>' +
                    (tags ? '<ul class="exp-card__tags">' + tags + '</ul>' : '') +
                    '<div class="exp-card__foot">' +
                        '<span class="exp-card__price">' + esc(precio(s)) + '</span>' +
                        '<div class="exp-card__actions">' +
                            '<a class="btn btn--small" href="' + esc(ruta(s.url)) + '">Ver detalle</a>' +
                            '<a class="btn btn--small btn--outline" data-wa data-wa-text="' + esc(mensaje) + '" href="#">Consultar</a>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    function renderGaleria(galeria) {
        var box = d.getElementById('galeria-preview');
        if (!box || !galeria || !galeria.fotos) return;
        var fotos = galeria.fotos.filter(function (f) { return f.mostrar_en_portada; }).slice(0, 6);
        box.innerHTML = fotos.map(function (f) {
            return '<a class="gallery__item reveal" href="' + esc(ruta(f.archivo)) + '" data-lightbox data-caption="' + esc(f.titulo) + '">' +
                '<img src="' + esc(ruta(f.archivo)) + '" alt="' + esc(f.titulo) + '" loading="lazy" width="' + (f.ancho || 1200) + '" height="' + (f.alto || 900) + '">' +
                '<span class="gallery__caption">' + esc(f.titulo) + '</span>' +
            '</a>';
        }).join('');
    }

    function renderFaq(sitio) {
        var box = d.getElementById('faq-list');
        if (!box || !sitio.faq) return;
        box.innerHTML = sitio.faq.map(function (f) {
            return '<details class="faq__item reveal"><summary>' + esc(f.pregunta) + '</summary><p>' + esc(f.respuesta) + '</p></details>';
        }).join('');
    }

    function hero(sitio) {
        var hero = d.querySelector('.hero');
        if (!hero) return;
        var g = w.TermasData.galeria();
        var fotos = g && g.fotos ? g.fotos.filter(function (f) { return f.mostrar_en_portada && f.seccion === 'balneario'; }) : [];
        if (fotos.length) hero.style.setProperty('--hero-img', 'url("' + ruta(fotos[0].archivo) + '")');
        var lead = hero.querySelector('.hero__lead');
        if (lead && sitio.seo && sitio.seo.descripcion) lead.textContent = sitio.seo.descripcion;
    }

    w.TermasData.listo().then(function (cache) {
        renderFacts(cache.sitio);
        renderExperiencias(w.TermasData.servicios());
        renderGaleria(cache.galeria);
        renderFaq(cache.sitio);
        hero(cache.sitio);
        w.TermasData.aplicarEnlaces();
        if (w.TermasUI) w.TermasUI.observar(d, '.reveal');
    }).catch(function () {
        var box = d.getElementById('experiencias-grid');
        if (box) box.innerHTML = '<p>No se pudo cargar el catálogo. Intenta recargar la página.</p>';
    });
})(window, document);
