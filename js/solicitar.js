/* ==========================================================
   Termas del Río · Fase 3 — Formulario de solicitudes
   El sitio es 100 % estático: este formulario NO envía nada a un
   servidor ni guarda datos. Redacta el mensaje con los datos que
   el visitante escribe y lo abre en WhatsApp (o en su correo).
   La confirmación de cada solicitud es MANUAL por el personal
   autorizado. Los tipos activos se leen de data/solicitudes-tipos.json.
   ========================================================== */
(function () {
    var WA_NUMBER = '50493515778';
    var EMAIL = 'reservaciones@termasdelrio.com';
    var DATA_URL = 'data/solicitudes-tipos.json';

    /* Presentación de cada campo (el orden y la composición vienen del JSON) */
    var CAMPOS = {
        nombre:        { etiqueta: 'Nombre',             tipo: 'text',     requerido: true,  ancho: 'medio',  placeholder: 'Tu nombre' },
        telefono:      { etiqueta: 'Teléfono / WhatsApp',tipo: 'tel',      requerido: true,  ancho: 'medio',  placeholder: '+504 0000-0000' },
        fecha:         { etiqueta: 'Fecha de la visita',  tipo: 'date',                       ancho: 'medio' },
        fecha_llegada: { etiqueta: 'Fecha de llegada',    tipo: 'date',                       ancho: 'medio' },
        fecha_salida:  { etiqueta: 'Fecha de salida',     tipo: 'date',                       ancho: 'medio' },
        adultos:       { etiqueta: 'Adultos',            tipo: 'number',   min: 0,           ancho: 'medio' },
        ninos:         { etiqueta: 'Niños',              tipo: 'number',   min: 0,           ancho: 'medio' },
        personas:      { etiqueta: 'Personas',           tipo: 'number',   min: 1,           ancho: 'medio' },
        tipo_de_grupo: { etiqueta: 'Tipo de grupo',      tipo: 'select',
                         opciones: ['Familiar', 'Escolar', 'Trabajo o empresa', 'Iglesia', 'Turismo', 'Otro'],
                         ancho: 'medio' },
        mensaje:       { etiqueta: 'Mensaje (opcional)', tipo: 'textarea',                   ancho: 'ancho',
                         placeholder: 'Cualquier detalle que quieras agregar' }
    };

    var nav = document.getElementById('type-nav');
    var eyebrow = document.getElementById('form-type-eyebrow');
    var fieldsBox = document.getElementById('form-fields');
    var form = document.getElementById('request-form');
    var mailBtn = document.getElementById('send-mail');
    var fallback = document.getElementById('form-fallback');
    var types = [];
    var current = null;

    function parseTipo() {
        var m = location.search.match(/[?&]tipo=([a-z0-9\-]+)/i);
        return m ? decodeURIComponent(m[1]) : null;
    }

    function findType(id) {
        for (var i = 0; i < types.length; i++) if (types[i].id === id) return types[i];
        return null;
    }

    function selectType(t) {
        current = t;
        Array.prototype.forEach.call(nav.children, function (b) {
            b.setAttribute('aria-pressed', b.getAttribute('data-id') === t.id ? 'true' : 'false');
        });
        if (eyebrow) eyebrow.textContent = t.nombre;
        renderFields(t.campos || []);
    }

    function renderFields(campos) {
        fieldsBox.innerHTML = '';
        campos.forEach(function (c) {
            var def = CAMPOS[c];
            if (!def) return;
            var wrap = document.createElement('div');
            wrap.className = 'field' + (def.ancho === 'ancho' ? ' field--wide' : '');

            var label = document.createElement('label');
            label.setAttribute('for', 'f-' + c);
            label.textContent = def.etiqueta;
            wrap.appendChild(label);

            var control;
            if (def.tipo === 'textarea') {
                control = document.createElement('textarea');
                control.rows = 4;
                if (def.placeholder) control.placeholder = def.placeholder;
            } else if (def.tipo === 'select') {
                control = document.createElement('select');
                var empty = document.createElement('option');
                empty.value = '';
                empty.textContent = 'Elige una opción';
                control.appendChild(empty);
                def.opciones.forEach(function (o) {
                    var op = document.createElement('option');
                    op.value = o;
                    op.textContent = o;
                    control.appendChild(op);
                });
            } else {
                control = document.createElement('input');
                control.type = def.tipo;
                if (def.min !== undefined) control.min = def.min;
                if (def.placeholder) control.placeholder = def.placeholder;
            }
            control.id = 'f-' + c;
            control.name = c;
            if (def.requerido) control.required = true;
            wrap.appendChild(control);

            if (def.requerido) {
                var err = document.createElement('p');
                err.className = 'field-error';
                err.textContent = 'Completa este dato, por favor.';
                wrap.appendChild(err);
            }
            fieldsBox.appendChild(wrap);
        });
    }

    function fmtDate(v) {
        var p = v.split('-');
        return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : v;
    }

    function buildMessage() {
        var lines = [current.intro_whatsapp || ('Hola, quisiera información de ' + current.nombre + ' de Termas del Río.')];
        (current.campos || []).forEach(function (c) {
            var def = CAMPOS[c];
            var el = document.getElementById('f-' + c);
            if (!def || !el) return;
            var v = (el.value || '').trim();
            if (!v) return;
            if (def.tipo === 'date') v = fmtDate(v);
            lines.push(def.etiqueta + ': ' + v);
        });
        return lines.join('\n');
    }

    function validate() {
        var ok = true;
        var firstBad = null;
        (current.campos || []).forEach(function (c) {
            var def = CAMPOS[c];
            var el = document.getElementById('f-' + c);
            if (!def || !el) return;
            if (def.requerido && !el.value.trim()) {
                el.parentNode.classList.add('is-invalid');
                if (!firstBad) firstBad = el;
                ok = false;
            } else {
                el.parentNode.classList.remove('is-invalid');
            }
        });
        if (firstBad) firstBad.focus();
        return ok;
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!current || !validate()) return;
        var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(buildMessage());
        window.open(url, '_blank', 'noopener');
    });

    mailBtn.addEventListener('click', function () {
        if (!current || !validate()) return;
        var subject = 'Solicitud: ' + current.nombre + ' — Termas del Río';
        location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(buildMessage());
    });

    fetch(DATA_URL)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            types = (data.tipos || []).filter(function (t) { return t.estado === 'activo'; });
            if (!types.length) throw new Error('sin tipos activos');
            types.forEach(function (t) {
                var b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('data-id', t.id);
                b.setAttribute('aria-pressed', 'false');
                b.textContent = t.nombre_corto || t.nombre;
                b.addEventListener('click', function () { selectType(t); });
                nav.appendChild(b);
            });
            selectType(findType(parseTipo()) || types[0]);
        })
        .catch(function () {
            form.hidden = true;
            if (fallback) fallback.hidden = false;
        });
})();
