/* ==========================================================
   Termas del Río · Pantalla de bienvenida cinematográfica
   ----------------------------------------------------------
   - Se crea por JS (el contenido SEO nunca queda detrás de ella).
   - Se muestra una sola vez por sesión.
   - Botón "Omitir" y tecla Escape.
   - Respeta prefers-reduced-motion: no se muestra.
   - Duración total < 3 s.
   ========================================================== */
(function (w, d) {
    'use strict';

    var CLAVE = 'termas_intro_vista';
    var reducido = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function crear(opciones) {
        var capa = d.createElement('div');
        capa.className = 'intro';
        capa.setAttribute('role', 'dialog');
        capa.setAttribute('aria-label', 'Bienvenido a Termas del Río');
        capa.setAttribute('aria-modal', 'true');

        var fondos = (opciones.fotos || []).map(function (src, i) {
            var url = w.TermasData.ruta(src).replace(/'/g, "%27");
            return '<div class="intro__foto' + (i === 0 ? ' is-active' : '') + '" style="background-image:url(\'' + url + '\')"></div>';
        }).join('');

        capa.innerHTML =
            '<div class="intro__fondos">' + fondos + '</div>' +
            '<div class="intro__velo"></div>' +
            '<div class="intro__contenido">' +
                '<img class="intro__logo" src="' + w.TermasData.ruta('img/favicon.svg') + '" alt="" width="72" height="72">' +
                '<p class="intro__eyebrow">' + (opciones.submarca || '') + '</p>' +
                '<h1 class="intro__titulo">BIENVENIDO A<br><span>' + (opciones.nombre || 'TERMAS DEL RÍO') + '</span></h1>' +
                '<div class="intro__linea"></div>' +
                '<p class="intro__pie">Aguas termales · Gracias, Lempira</p>' +
            '</div>' +
            '<button type="button" class="intro__skip">Omitir introducción <span aria-hidden="true">→</span></button>';

        d.body.appendChild(capa);
        d.body.classList.add('intro-activa');

        var boton = capa.querySelector('.intro__skip');
        var fotos = capa.querySelectorAll('.intro__foto');
        var intervalo = null;
        var cerrado = false;

        function cerrar() {
            if (cerrado) return;
            cerrado = true;
            if (intervalo) clearInterval(intervalo);
            capa.classList.add('is-saliendo');
            d.body.classList.remove('intro-activa');
            w.setTimeout(function () {
                if (capa.parentNode) capa.parentNode.removeChild(capa);
            }, 650);
            try { w.sessionStorage.setItem(CLAVE, '1'); } catch (e) {}
        }

        boton.addEventListener('click', cerrar);
        d.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') cerrar();
        });

        if (fotos.length > 1) {
            var actual = 0;
            intervalo = w.setInterval(function () {
                fotos[actual].classList.remove('is-active');
                actual = (actual + 1) % fotos.length;
                fotos[actual].classList.add('is-active');
            }, 1100);
        }

        w.setTimeout(cerrar, 2900);
    }

    var iniciado = false;

    function iniciar() {
        if (iniciado) return Promise.resolve();
        iniciado = true;
        if (reducido) return Promise.resolve();
        var visto = false;
        try { visto = w.sessionStorage.getItem(CLAVE) === '1'; } catch (e) {}
        if (visto) return Promise.resolve();
        return w.TermasData.listo().then(function () {
            crear(w.TermasData.introOpciones());
        }).catch(function () { /* sin datos: seguimos sin intro */ });
    }

    w.TermasIntro = { iniciar: iniciar };

    /* Este archivo solo se carga en la portada: la intro arranca sola. */
    if (d.readyState === 'loading') {
        d.addEventListener('DOMContentLoaded', iniciar, { once: true });
    } else {
        iniciar();
    }
})(window, document);
