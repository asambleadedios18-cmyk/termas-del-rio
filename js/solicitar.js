/* ==========================================================
   Termas del Río · Formulario público de solicitudes
   ----------------------------------------------------------
   Cada solicitud se registra en el panel de reservaciones
   mediante la función pública `crear_solicitud_publica`.
   La confirmación SIEMPRE es manual por el personal.

   Si Supabase no está configurado o no responde, el visitante
   puede enviar la misma solicitud por WhatsApp o correo.
   Los tipos activos se leen de data/solicitudes-tipos.json.
   ========================================================== */
(function () {
    var WA_NUMBER = '50493515778';
    var EMAIL = 'reservaciones@termasdelrio.com';
    var DATA_URL = 'data/solicitudes-tipos.json';

    /* Tipos de cabaña de respaldo: se usan solo si Supabase no responde.
       Con Supabase activo, los tipos reales vienen de la base de datos. */
    var TIPOS_RESPALDO = [
        { id: null, nombre: 'Cabaña Doble – 2 camas', capacidad_max: 2, camas: '2 camas Queen' },
        { id: null, nombre: 'Cabaña Triple – 3 camas', capacidad_max: 3, camas: '2 camas Queen + 1 cama unipersonal' }
    ];

    /* Presentación de cada campo (el orden y la composición vienen del JSON) */
    var CAMPOS = {
        nombre:        { etiqueta: 'Nombre completo',      tipo: 'text',     requerido: true,  ancho: 'medio', placeholder: 'Tu nombre y apellidos' },
        telefono:      { etiqueta: 'Teléfono / WhatsApp',  tipo: 'tel',      requerido: true,  ancho: 'medio', placeholder: '+504 0000-0000' },
        email:         { etiqueta: 'Correo electrónico',   tipo: 'email',                      ancho: 'medio', placeholder: 'correo@ejemplo.com' },
        pais:          { etiqueta: 'País',                 tipo: 'text',                       ancho: 'medio', placeholder: 'Honduras' },
        fecha:         { etiqueta: 'Fecha de la visita',   tipo: 'date',                       ancho: 'medio' },
        fecha_llegada: { etiqueta: 'Fecha de llegada',     tipo: 'date',     requerido: true,  ancho: 'medio' },
        fecha_salida:  { etiqueta: 'Fecha de salida',      tipo: 'date',     requerido: true,  ancho: 'medio' },
        tipo_cabana:   { etiqueta: 'Tipo de cabaña',       tipo: 'select',   requerido: true,  ancho: 'ancho', dinamico: true },
        adultos:       { etiqueta: 'Adultos',              tipo: 'number',   min: 1,           ancho: 'medio', valor: '2' },
        ninos:         { etiqueta: 'Niños',                tipo: 'number',   min: 0,           ancho: 'medio', valor: '0' },
        personas:      { etiqueta: 'Personas',             tipo: 'number',   min: 1,           ancho: 'medio' },
        tipo_de_grupo: { etiqueta: 'Tipo de grupo',        tipo: 'select',
                         opciones: ['Familiar', 'Escolar', 'Trabajo o empresa', 'Iglesia', 'Turismo', 'Otro'],
                         ancho: 'medio' },
        mensaje:       { etiqueta: 'Mensaje (opcional)',   tipo: 'textarea',                   ancho: 'ancho',
                         placeholder: 'Cualquier detalle que quieras agregar' }
    };

    var nav = document.getElementById('type-nav');
    var eyebrow = document.getElementById('form-type-eyebrow');
    var fieldsBox = document.getElementById('form-fields');
    var form = document.getElementById('request-form');
    var btnRegistrar = document.getElementById('send-request');
    var btnWhatsApp = document.getElementById('send-whatsapp');
    var btnMail = document.getElementById('send-mail');
    var consent = document.getElementById('f-consentimiento');
    var consentError = document.getElementById('consent-error');
    var honeypot = document.getElementById('f-empresa');
    var privacy = document.getElementById('request-privacy');
    var resultBox = document.getElementById('request-result');
    var resultCode = document.getElementById('request-result-code');
    var resultText = document.getElementById('request-result-text');
    var resultWa = document.getElementById('request-result-wa');
    var resultNew = document.getElementById('request-result-new');
    var errorBox = document.getElementById('request-error');
    var fallback = document.getElementById('form-fallback');

    var types = [];
    var current = null;
    var tiposCabana = TIPOS_RESPALDO;
    var clientePromesa = null;
    var ultimoMensaje = '';
    var enviando = false;

    var supabaseConfig = window.TERMAS_SUPABASE || null;
    var usarSupabase = Boolean(supabaseConfig && typeof supabaseConfig.configurado === 'function' && supabaseConfig.configurado());

    function hoyISO() {
        var d = new Date();
        var m = String(d.getMonth() + 1);
        var dia = String(d.getDate());
        return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dia.length < 2 ? '0' + dia : dia);
    }

    function sumarDias(iso, dias) {
        var p = iso.split('-');
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        d.setDate(d.getDate() + dias);
        var m = String(d.getMonth() + 1);
        var dia = String(d.getDate());
        return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (dia.length < 2 ? '0' + dia : dia);
    }

    function fmtDate(v) {
        if (!v) return '';
        var p = v.split('-');
        return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : v;
    }

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
        ocultarResultado();
        ocultarError();
        renderFields(t.campos || []);
        if (consent) consent.checked = false;
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
                var opciones = def.dinamico
                    ? tiposCabana.map(function (t) { return { valor: t.id || t.nombre, texto: t.nombre }; })
                    : (def.opciones || []).map(function (o) { return { valor: o, texto: o }; });
                opciones.forEach(function (o) {
                    var op = document.createElement('option');
                    op.value = o.valor;
                    op.textContent = o.texto;
                    control.appendChild(op);
                });
            } else {
                control = document.createElement('input');
                control.type = def.tipo;
                if (def.min !== undefined) control.min = def.min;
                if (def.placeholder) control.placeholder = def.placeholder;
                if (def.valor !== undefined) control.value = def.valor;
            }
            control.id = 'f-' + c;
            control.name = c;
            if (def.requerido) control.required = true;

            if (def.tipo === 'date') {
                control.min = hoyISO();
                if (c === 'fecha_salida') control.min = sumarDias(hoyISO(), 1);
            }

            if (c === 'fecha_llegada' && control.addEventListener) {
                control.addEventListener('change', function () {
                    var salida = document.getElementById('f-fecha_salida');
                    if (!salida) return;
                    salida.min = control.value ? sumarDias(control.value, 1) : sumarDias(hoyISO(), 1);
                    if (salida.value && salida.value <= control.value) salida.value = sumarDias(control.value, 1);
                });
            }

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

    function recogerCampos() {
        var datos = {};
        (current.campos || []).forEach(function (c) {
            var el = document.getElementById('f-' + c);
            if (!el) return;
            datos[c] = (el.value || '').trim();
        });
        return datos;
    }

    function datosMensaje() {
        var datos = recogerCampos();
        var lineas = [];
        (current.campos || []).forEach(function (c) {
            var def = CAMPOS[c];
            var v = datos[c];
            if (!def || !v) return;
            if (def.tipo === 'date') v = fmtDate(v);
            lineas.push(def.etiqueta + ': ' + v);
        });
        return lineas;
    }

    function construirMensaje() {
        var intro = current.intro_whatsapp || ('Hola, quisiera información de ' + current.nombre + ' de Termas del Río.');
        return [intro].concat(datosMensaje()).join('\n');
    }

    function validar() {
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

        if (consent && !consent.checked) {
            if (consentError) consentError.classList.add('is-visible');
            ok = false;
            if (!firstBad) firstBad = consent;
        } else if (consentError) {
            consentError.classList.remove('is-visible');
        }

        var entrada = document.getElementById('f-fecha_llegada');
        var salida = document.getElementById('f-fecha_salida');
        if (entrada && salida && entrada.value && salida.value && salida.value <= entrada.value) {
            salida.parentNode.classList.add('is-invalid');
            var msg = salida.parentNode.querySelector('.field-error');
            if (msg) msg.textContent = 'La salida debe ser posterior a la llegada.';
            ok = false;
            if (!firstBad) firstBad = salida;
        }

        if (firstBad) firstBad.focus();
        return ok;
    }

    function ocultarError() {
        if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    }

    function mostrarError(texto) {
        if (!errorBox) return;
        errorBox.textContent = texto;
        errorBox.hidden = false;
    }

    function ocultarResultado() {
        if (resultBox) resultBox.hidden = true;
        if (btnRegistrar) btnRegistrar.disabled = false;
        enviando = false;
    }

    function mostrarResultado(codigo) {
        ultimoMensaje = construirMensaje();
        if (resultCode) resultCode.textContent = codigo || 'Solicitud recibida';
        if (resultText) {
            resultText.textContent = 'Nuestro equipo revisará la disponibilidad y te confirmará por WhatsApp o correo. Guarda este código para dar seguimiento.';
        }
        if (resultBox) resultBox.hidden = false;
        if (btnRegistrar) btnRegistrar.disabled = true;
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function abrirWhatsApp(texto) {
        window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    }

    function abrirCorreo(texto) {
        var subject = 'Solicitud: ' + current.nombre + ' - Termas del Río';
        location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(texto);
    }

    /* ---------- Supabase ---------- */
    function obtenerCliente() {
        if (!usarSupabase) return Promise.resolve(null);
        if (clientePromesa) return clientePromesa;
        clientePromesa = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
            .then(function (mod) {
                return mod.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });
            })
            .catch(function () {
                usarSupabase = false;
                return null;
            });
        return clientePromesa;
    }

    function cargarTiposCabana() {
        return obtenerCliente().then(function (cliente) {
            if (!cliente) return null;
            return cliente.rpc('tipos_cabana_publicos').then(function (res) {
                if (res.error || !res.data || !res.data.length) return null;
                return res.data.map(function (t) {
                    return {
                        id: t.id,
                        nombre: t.nombre,
                        capacidad_max: t.capacidad_max,
                        camas: t.camas
                    };
                });
            });
        }).catch(function () { return null; });
    }

    function enviarSolicitud() {
        if (enviando) return;
        if (!validateAndPrepare()) return;

        /* Campo trampa: se descarta en silencio. */
        if (honeypot && honeypot.value) {
            mostrarResultado('Solicitud recibida');
            return;
        }

        if (!usarSupabase) {
            abrirWhatsApp(construirMensaje());
            return;
        }

        var datos = recogerCampos();
        var tipoCabana = datos.tipo_cabana || '';
        var esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tipoCabana);
        var entrada = current.id === 'hospedaje' ? datos.fecha_llegada : datos.fecha;
        var salida = current.id === 'hospedaje' ? datos.fecha_salida : null;
        var adultos = datos.adultos !== undefined && datos.adultos !== '' ? Number(datos.adultos)
            : (datos.personas ? Number(datos.personas) : 0);
        var ninos = datos.ninos ? Number(datos.ninos) : 0;

        var mensaje = (datos.mensaje || '').trim();
        if (datos.tipo_de_grupo && mensaje.indexOf('Tipo de grupo') === -1) {
            mensaje = (mensaje ? mensaje + '\n' : '') + 'Tipo de grupo: ' + datos.tipo_de_grupo;
        }

        enviando = true;
        btnRegistrar.disabled = true;
        btnRegistrar.textContent = 'Enviando…';
        ocultarError();

        obtenerCliente().then(function (cliente) {
            if (!cliente) throw new Error('SIN_CONEXION');
            return cliente.rpc('crear_solicitud_publica', {
                p_tipo: current.id,
                p_nombre: datos.nombre,
                p_telefono: datos.telefono,
                p_email: datos.email || null,
                p_pais: datos.pais || null,
                p_tipo_cabana_id: esUuid ? tipoCabana : null,
                p_fecha_entrada: entrada || null,
                p_fecha_salida: salida || null,
                p_adultos: adultos,
                p_ninos: ninos,
                p_mensaje: mensaje || null,
                p_consentimiento: true,
                p_honeypot: ''
            }).then(function (res) {
                if (res.error) throw res.error;
                return res.data;
            });
        }).then(function (codigo) {
            mostrarResultado(codigo);
            form.reset();
        }).catch(function (error) {
            var texto = String((error && (error.message || error.error_description)) || '');
            if (texto === 'SIN_CONEXION' || /failed to fetch|network|load failed/i.test(texto)) {
                mostrarError('No se pudo enviar al sistema en este momento. Puedes enviar tu solicitud por WhatsApp o correo con los mismos datos.');
            } else {
                mostrarError(texto || 'No se pudo registrar la solicitud. Intenta de nuevo o escríbenos por WhatsApp.');
            }
        }).then(function () {
            enviando = false;
            btnRegistrar.disabled = false;
            btnRegistrar.textContent = 'Enviar solicitud';
        });
    }

    function validateAndPrepare() {
        if (!current) return false;
        if (!validar()) return false;
        if (!form.reportValidity()) return false;
        return true;
    }

    /* ---------- Eventos ---------- */
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        enviarSolicitud();
    });

    btnWhatsApp.addEventListener('click', function () {
        if (!validateAndPrepare()) return;
        abrirWhatsApp(construirMensaje());
    });

    btnMail.addEventListener('click', function () {
        if (!validateAndPrepare()) return;
        abrirCorreo(construirMensaje());
    });

    resultWa.addEventListener('click', function () {
        abrirWhatsApp(ultimoMensaje || construirMensaje());
    });

    resultNew.addEventListener('click', function () {
        form.reset();
        ocultarResultado();
        ocultarError();
        if (consent) consent.checked = false;
        if (consentError) consentError.classList.remove('is-visible');
        renderFields(current.campos || []);
        fieldsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* ---------- Arranque ---------- */
    function iniciar() {
        if (privacy) {
            privacy.textContent = usarSupabase
                ? 'Tu solicitud queda registrada en nuestro sistema de reservaciones y la confirma manualmente nuestro personal autorizado. También puedes enviarla por WhatsApp o correo.'
                : 'Este sitio no guarda datos en un servidor: tu solicitud se abre directamente en WhatsApp o en tu correo, y la confirma manualmente nuestro personal autorizado.';
        }
        if (!usarSupabase && btnRegistrar) btnRegistrar.textContent = 'Enviar por WhatsApp';

        var tiposPromesa = usarSupabase ? cargarTiposCabana() : Promise.resolve(null);
        var tiposData = fetch(DATA_URL).then(function (r) { return r.json(); });

        return Promise.all([tiposData, tiposPromesa]).then(function (res) {
            var data = res[0];
            if (res[1] && res[1].length) tiposCabana = res[1];

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
        });
    }

    iniciar()['catch'](function () {
        form.hidden = true;
        if (fallback) fallback.hidden = false;
    });
})();
