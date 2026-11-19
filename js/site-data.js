/* ==========================================================
   Termas del Río · Capa central de datos públicos
   ----------------------------------------------------------
   Única fuente de verdad para identidad, contacto, WhatsApp,
   servicios, galería y tipos de solicitud.

   Todos los enlaces con data-wa / data-tel / data-mail se
   construyen desde data/sitio.json. Así el número oficial se
   cambia en un solo lugar.
   ========================================================== */
(function (w, d) {
    'use strict';

    /* La ruta se calcula desde la propia etiqueta <script>, no desde el
       documento: así funciona igual en /, en /servicios/ y en GitHub Pages. */
    var script = d.currentScript;
    if (!script) {
        var scripts = d.getElementsByTagName('script');
        script = scripts[scripts.length - 1];
    }
    var BASE = '';
    if (script && script.src) {
        var src = String(script.src).split('?')[0].split('#')[0];
        BASE = src.replace(/\/js\/[^/]+$/, '/');
        if (BASE === src) BASE = '';
    }
    if (!BASE) BASE = new URL('.', d.baseURI).href;

    function ruta(rel) {
        return BASE + String(rel == null ? '' : rel).replace(/^\/+/, '');
    }

    var ARCHIVOS = {
        sitio: ruta('data/sitio.json'),
        servicios: ruta('data/servicios.json'),
        galeria: ruta('data/galeria.json'),
        tipos: ruta('data/solicitudes-tipos.json')
    };

    var cache = {};
    var promesa = null;

    function fetchJson(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error('No se pudo cargar ' + url);
            return r.json();
        });
    }

    function cargar() {
        if (promesa) return promesa;
        promesa = Promise.all([
            fetchJson(ARCHIVOS.sitio),
            fetchJson(ARCHIVOS.servicios),
            fetchJson(ARCHIVOS.galeria),
            fetchJson(ARCHIVOS.tipos)
        ]).then(function (res) {
            cache = {
                sitio: res[0],
                servicios: res[1],
                galeria: res[2],
                tipos: res[3]
            };
            aplicarEnlaces();
            d.dispatchEvent(new CustomEvent('termas:datos-listos', { detail: cache }));
            return cache;
        });
        return promesa;
    }

    function get(nombre) { return cache[nombre] || null; }

    function publicados() {
        var s = get('servicios');
        return s ? (s.servicios || []).filter(function (x) { return x.estado === 'publicado'; }) : [];
    }

    function servicio(id) {
        var lista = publicados();
        for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
        return null;
    }

    function contacto() {
        var s = get('sitio');
        return s && s.contacto ? s.contacto : {};
    }

    function whatsapp() { return contacto().whatsapp || '50493515778'; }

    function wa(texto) {
        var base = 'https://wa.me/' + whatsapp();
        return texto ? base + '?text=' + encodeURIComponent(texto) : base;
    }

    function escapeHtml(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function textoWa(servicioId) {
        var s = servicio(servicioId);
        var sitio = get('sitio');
        var clave = (s && s.id) || servicioId;
        if (sitio && sitio.mensajes_whatsapp) {
            return sitio.mensajes_whatsapp[clave] || sitio.mensajes_whatsapp.general || 'Hola, quisiera información sobre Termas del Río';
        }
        return 'Hola, quisiera información sobre Termas del Río';
    }

    /* Reescribe enlaces centralizados */
    function aplicarEnlaces() {
        var c = contacto();
        Array.prototype.forEach.call(d.querySelectorAll('[data-wa]'), function (a) {
            var txt = a.getAttribute('data-wa-text');
            var mensaje = txt || (a.textContent || '').trim() || textoWa(a.getAttribute('data-wa'));
            if (txt === '@sitio') mensaje = textoWa(a.getAttribute('data-wa'));
            a.setAttribute('href', wa(mensaje));
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener');
        });
        Array.prototype.forEach.call(d.querySelectorAll('[data-tel]'), function (a) {
            if (c.telefono_enlace) a.setAttribute('href', c.telefono_enlace);
            if (c.telefono) a.textContent = c.telefono;
        });
        Array.prototype.forEach.call(d.querySelectorAll('[data-mail]'), function (a) {
            if (c.correo) {
                a.setAttribute('href', 'mailto:' + c.correo);
                a.textContent = c.correo;
            }
        });
        Array.prototype.forEach.call(d.querySelectorAll('[data-horario]'), function (el) {
            var s = get('sitio');
            if (s && s.horario) el.textContent = s.horario;
        });
    }

    /* Animación de entrada: una vez por sesión, respeta movimiento reducido */
    function introOpciones() {
        var s = get('sitio');
        var g = get('galeria');
        var fotos = (g && g.fotos ? g.fotos : []).filter(function (x) { return x.mostrar_en_portada; });
        return {
            nombre: s && s.identidad ? s.identidad.nombre : 'Termas del Río',
            submarca: s && s.identidad ? s.identidad.submarca : 'Aguas termales',
            fotos: fotos.slice(0, 4).map(function (x) { return x.archivo; })
        };
    }

    w.TermasData = {
        cargar: cargar,
        get: get,
        listo: function () { return promesa || cargar(); },
        sitio: function () { return get('sitio'); },
        servicios: publicados,
        servicio: servicio,
        galeria: function () { return get('galeria'); },
        tipos: function () { var t = get('tipos'); return t ? t.tipos || [] : []; },
        tiposCabana: function () { var s = get('sitio'); return s && s.tipos_cabana ? s.tipos_cabana : []; },
        contacto: contacto,
        base: BASE,
        ruta: ruta,
        whatsapp: whatsapp,
        wa: wa,
        textoWa: textoWa,
        escapeHtml: escapeHtml,
        aplicarEnlaces: aplicarEnlaces,
        introOpciones: introOpciones
    };

    /* Arranque automático: las páginas que no renderizan catálogo
       (servicios, contacto, ubicación, 404) también necesitan los
       enlaces de WhatsApp, teléfono, correo y horario centralizados. */
    if (d.readyState === 'loading') {
        d.addEventListener('DOMContentLoaded', cargar, { once: true });
    } else {
        cargar();
    }
})(window, document);
