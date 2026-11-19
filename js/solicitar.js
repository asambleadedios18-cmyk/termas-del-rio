/* ==========================================================
   Termas del Río · Motor de reservaciones por WhatsApp
   ----------------------------------------------------------
   Flujo:
   1) El visitante elige servicio, fecha, personas y sus datos.
   2) "Revisar solicitud" valida y muestra un resumen.
   3) "Confirmar reservación por WhatsApp" abre wa.me con el
      mensaje organizado. El número sale de data/sitio.json.
   4) La solicitud queda PENDIENTE DE CONFIRMACIÓN. Si Supabase
      está configurado, se registra como pendiente en el panel;
      si no, el mensaje de WhatsApp es igual de válido.
   ========================================================== */
(function (w, d) {
    'use strict';

    var T = w.TermasData;
    var form = d.getElementById('reserve-form');
    if (!form || !T) return;

    var ids = ['servicio', 'fecha', 'hora', 'adultos', 'ninos', 'alojamiento', 'noches', 'notas', 'nombre', 'telefono'];
    var f = {};
    ids.forEach(function (id) { f[id] = d.getElementById('f-' + id); });

    var consent = d.getElementById('f-consentimiento');
    var consentError = d.getElementById('consent-error');
    var serviceNote = d.getElementById('service-note');
    var resumen = d.getElementById('resumen');
    var summaryList = d.getElementById('summary-list');
    var confirmar = d.getElementById('confirmar-wa');
    var editar = d.getElementById('editar-solicitud');
    var waFallback = d.getElementById('wa-fallback');
    var waStatus = d.getElementById('wa-status');
    var errorBox = d.getElementById('request-error');
    var fallback = d.getElementById('form-fallback');
    var privacy = d.getElementById('request-privacy');

    var servicios = [];
    var tipos = [];
    var tiposCabana = [];
    var currentServicio = null;
    var ultimosDatos = null;
    var ultimoMensaje = '';

    var supabaseConfig = w.TERMAS_SUPABASE || null;
    var usarSupabase = Boolean(supabaseConfig && typeof supabaseConfig.configurado === 'function' && supabaseConfig.configurado());
    var clientePromesa = null;

    function esc(v) { return T.escapeHtml(v); }

    function parametro(nombre) {
        try {
            var v = new URLSearchParams(w.location.search).get(nombre);
            return v ? decodeURIComponent(v) : null;
        } catch (e) {
            var m = w.location.search.match(new RegExp('[?&]' + nombre + '=([^&]+)', 'i'));
            return m ? decodeURIComponent(m[1]) : null;
        }
    }

    function hoyISO() {
        var x = new Date();
        return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    }

    function sumarDias(iso, dias) {
        if (!iso) return '';
        var p = iso.split('-');
        var x = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        x.setDate(x.getDate() + Number(dias || 0));
        return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    }

    function fmtFecha(iso) {
        if (!iso) return '';
        var p = iso.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
    }

    function encontrarServicio(id) {
        for (var i = 0; i < servicios.length; i++) if (servicios[i].id === id) return servicios[i];
        return null;
    }

    function encontrarTipo(id) {
        for (var i = 0; i < tipos.length; i++) if (tipos[i].id === id) return tipos[i];
        return null;
    }

    function limpierErrors() {
        Array.prototype.forEach.call(form.querySelectorAll('.field'), function (el) {
            el.classList.remove('is-invalid');
        });
        if (consentError) consentError.classList.remove('is-visible');
        if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    }

    function marcar(id) {
        var el = f[id];
        if (!el) return;
        var field = el.closest('.field');
        if (field) field.classList.add('is-invalid');
    }

    function mostrarError(texto) {
        if (!errorBox) return;
        errorBox.textContent = texto;
        errorBox.hidden = false;
    }

    function ocultarResumen() {
        if (resumen) resumen.hidden = true;
        if (waStatus) { waStatus.textContent = ''; waStatus.className = 'wa-status'; }
    }

    function setVisible(id, visible) {
        var field = form.querySelector('[data-field="' + id + '"]');
        if (field) field.classList.toggle('field--hidden', !visible);
        if (f[id]) f[id].required = Boolean(visible && f[id].required !== undefined && (id === 'alojamiento' || id === 'noches'));
    }

    function renderServicios() {
        var preferido = parametro('servicio') || parametro('cabana') ? (parametro('servicio') || 'cabanas') : null;
        var tipoParam = parametro('tipo');
        var opciones = '<option value="">Elige un servicio</option>';

        servicios.forEach(function (s) {
            opciones += '<option value="' + esc(s.id) + '">' + esc(s.nombre_corto || s.nombre) + '</option>';
        });
        f.servicio.innerHTML = opciones;

        if (!preferido && tipoParam) {
            servicios.forEach(function (s) {
                if (s.solicitud === tipoParam) preferido = s.id;
            });
        }
        if (preferido && encontrarServicio(preferido)) {
            f.servicio.value = preferido;
        }
        alCambiarServicio();
    }

    function llenarAlojamientos() {
        if (!f.alojamiento) return;
        var actual = f.alojamiento.value;
        var html = '<option value="">Elige una opción</option>';
        tiposCabana.forEach(function (t) {
            var valor = t.id || t.slug || t.nombre;
            var texto = t.nombre + (t.camas ? ' · ' + t.camas : '');
            html += '<option value="' + esc(valor) + '">' + esc(texto) + '</option>';
        });
        f.alojamiento.innerHTML = html;
        if (actual) f.alojamiento.value = actual;

        var pref = parametro('cabana');
        if (pref && !f.alojamiento.value) {
            Array.prototype.forEach.call(f.alojamiento.options, function (op) {
                if (!f.alojamiento.value && (op.value.toLowerCase().indexOf(pref) !== -1 || op.text.toLowerCase().indexOf(pref) !== -1)) {
                    f.alojamiento.value = op.value;
                }
            });
        }
    }

    function alCambiarServicio() {
        currentServicio = encontrarServicio(f.servicio.value);
        var esCabana = Boolean(currentServicio && currentServicio.id === 'cabanas');

        setVisible('alojamiento', esCabana);
        setVisible('noches', esCabana);
        if (esCabana) llenarAlojamientos();

        if (currentServicio && serviceNote) {
            var partes = [];
            if (currentServicio.resumen) partes.push(currentServicio.resumen);
            if (currentServicio.horario) partes.push('Horario: ' + currentServicio.horario);
            else if (currentServicio.horario_nota) partes.push(currentServicio.horario_nota);
            if (currentServicio.precios && currentServicio.precios.length) {
                var p = currentServicio.precios[0];
                partes.push('Tarifa referencial: ' + p.valor + (p.detalle ? ' (' + p.detalle + ')' : ''));
            }
            serviceNote.textContent = partes.join(' ');
            serviceNote.hidden = false;
        } else if (serviceNote) {
            serviceNote.hidden = true;
        }
        ocultarResumen();
    }

    function sincronizarNoches() {
        if (!currentServicio || currentServicio.id !== 'cabanas') return;
        var entrada = f.fecha.value;
        var salida = sumarDias(entrada, Math.max(1, Number(f.noches.value) || 1));
        f.noches.dataset.salida = salida;
    }

    function validar() {
        limpierErrors();
        var ok = true;
        var primero = null;

        function requerir(id, condicion) {
            if (!condicion) {
                marcar(id);
                ok = false;
                if (!primero) primero = f[id];
            }
        }

        requerir('servicio', Boolean(currentServicio));
        requerir('fecha', Boolean(f.fecha.value));
        if (f.fecha.value && f.fecha.value < hoyISO()) {
            marcar('fecha'); ok = false; if (!primero) primero = f.fecha;
        }
        requerir('adultos', Number(f.adultos.value) >= 1);
        requerir('nombre', (f.nombre.value || '').trim().length >= 2);
        requerir('telefono', /^[0-9+()\s-]{8,}$/.test((f.telefono.value || '').trim()));

        if (currentServicio && currentServicio.id === 'cabanas') {
            requerir('alojamiento', Boolean(f.alojamiento.value));
            requerir('noches', Number(f.noches.value) >= 1);
        }

        if (!consent || !consent.checked) {
            if (consentError) consentError.classList.add('is-visible');
            ok = false;
            if (!primero) primero = consent;
        }

        if (!ok && primero) {
            primero.focus();
            mostrarError('Revisa los campos marcados antes de continuar.');
        }
        return ok;
    }

    function recoger() {
        return {
            servicioId: currentServicio ? currentServicio.id : '',
            servicio: currentServicio ? (currentServicio.nombre || currentServicio.nombre_corto) : '',
            tipo: currentServicio ? (currentServicio.solicitud || 'visita-dia') : 'visita-dia',
            fecha: f.fecha.value || '',
            hora: f.hora.value || '',
            adultos: f.adultos.value || '0',
            ninos: f.ninos.value || '0',
            alojamiento: currentServicio && currentServicio.id === 'cabanas' ? (f.alojamiento.options[f.alojamiento.selectedIndex] || {}).text || '' : '',
            alojamientoValor: currentServicio && currentServicio.id === 'cabanas' ? f.alojamiento.value : '',
            noches: currentServicio && currentServicio.id === 'cabanas' ? (f.noches.value || '1') : '',
            salida: currentServicio && currentServicio.id === 'cabanas' ? sumarDias(f.fecha.value, Math.max(1, Number(f.noches.value) || 1)) : '',
            notas: (f.notas.value || '').trim(),
            nombre: (f.nombre.value || '').trim(),
            telefono: (f.telefono.value || '').trim()
        };
    }

    function fila(dt, dd, ancho) {
        if (!dd) return '';
        return '<div' + (ancho ? ' class="summary-list__wide"' : '') + '><dt>' + esc(dt) + '</dt><dd>' + esc(dd) + '</dd></div>';
    }

    function mostrarResumen(datos) {
        var html = '';
        html += fila('Servicio', datos.servicio, true);
        html += fila('Fecha', fmtFecha(datos.fecha));
        html += fila('Hora estimada de llegada', datos.hora);
        html += fila('Adultos', datos.adultos);
        html += fila('Niños', datos.ninos);
        html += fila('Alojamiento', datos.alojamiento, true);
        html += fila('Noches', datos.noches);
        html += fila('Fecha estimada de salida', fmtFecha(datos.salida));
        html += fila('Nombre', datos.nombre);
        html += fila('Teléfono / WhatsApp', datos.telefono);
        html += fila('Información adicional', datos.notas, true);
        summaryList.innerHTML = html;

        ultimosDatos = datos;
        ultimoMensaje = construirMensaje(datos);
        waFallback.href = T.wa(ultimoMensaje);
        waFallback.hidden = false;
        resumen.hidden = false;
        resumen.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function construirMensaje(datos) {
        var lineas = [
            'Hola, quisiera solicitar una reservación en Termas del Río.',
            '',
            'SOLICITUD PENDIENTE DE CONFIRMACIÓN',
            '',
            'Servicio: ' + datos.servicio,
            'Fecha: ' + fmtFecha(datos.fecha)
        ];
        if (datos.hora) lineas.push('Hora estimada de llegada: ' + datos.hora + ' (sujeta a confirmación)');
        lineas.push('Adultos: ' + datos.adultos);
        lineas.push('Niños: ' + datos.ninos);
        if (datos.alojamiento) lineas.push('Alojamiento: ' + datos.alojamiento);
        if (datos.noches) lineas.push('Noches: ' + datos.noches);
        if (datos.salida) lineas.push('Salida estimada: ' + fmtFecha(datos.salida));
        if (datos.notas) lineas.push('Información adicional: ' + datos.notas);
        lineas.push('');
        lineas.push('Nombre: ' + datos.nombre);
        lineas.push('Teléfono / WhatsApp: ' + datos.telefono);
        lineas.push('');
        lineas.push('Favor de confirmar disponibilidad. Entiendo que esta solicitud no queda confirmada hasta que el personal de Termas del Río la apruebe.');
        return lineas.join('\n');
    }

    /* ---------- Supabase opcional: solo registra como pendiente ---------- */
    function obtenerCliente() {
        if (!usarSupabase) return Promise.resolve(null);
        if (clientePromesa) return clientePromesa;
        clientePromesa = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
            .then(function (mod) {
                return mod.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });
            })
            .catch(function () { usarSupabase = false; return null; });
        return clientePromesa;
    }

    function cargarTiposCabanaRemotos() {
        return obtenerCliente().then(function (cliente) {
            if (!cliente) return null;
            return cliente.rpc('tipos_cabana_publicos').then(function (res) {
                if (res.error || !res.data || !res.data.length) return null;
                return res.data.map(function (t) {
                    return {
                        id: t.id,
                        slug: t.slug,
                        nombre: t.nombre,
                        capacidad_max: t.capacidad_max,
                        camas: t.camas
                    };
                });
            });
        }).catch(function () { return null; });
    }

    function registrar(datos, mensaje) {
        if (!usarSupabase) return Promise.resolve(null);
        return obtenerCliente().then(function (cliente) {
            if (!cliente) return null;
            var extras = [];
            if (datos.hora) extras.push('Hora estimada de llegada: ' + datos.hora);
            if (datos.alojamiento) extras.push('Alojamiento: ' + datos.alojamiento);
            if (datos.noches) extras.push('Noches: ' + datos.noches);
            var cuerpo = (datos.notas ? datos.notas + '\n' : '') + extras.join('\n');
            var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(datos.alojamientoValor || '') ? datos.alojamientoValor : null;

            return cliente.rpc('crear_solicitud_publica', {
                p_tipo: datos.tipo,
                p_nombre: datos.nombre,
                p_telefono: datos.telefono,
                p_email: null,
                p_pais: null,
                p_tipo_cabana_id: uuid,
                p_fecha_entrada: datos.fecha || null,
                p_fecha_salida: datos.salida || null,
                p_adultos: Number(datos.adultos) || 0,
                p_ninos: Number(datos.ninos) || 0,
                p_mensaje: cuerpo || mensaje,
                p_consentimiento: true,
                p_honeypot: ''
            }).then(function (res) {
                if (res.error) throw res.error;
                return res.data;
            });
        }).catch(function () { return null; });
    }

    /* ---------- Eventos ---------- */
    f.servicio.addEventListener('change', alCambiarServicio);
    f.fecha.addEventListener('change', sincronizarNoches);
    f.noches.addEventListener('input', sincronizarNoches);

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validar()) return;
        mostrarResumen(recoger());
    });

    form.addEventListener('reset', function () {
        w.setTimeout(function () {
            limpierErrors();
            ocultarResumen();
            if (f.noches) f.noches.value = '1';
            alCambiarServicio();
        }, 0);
    });

    editar.addEventListener('click', function () {
        ocultarResumen();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        f.servicio.focus();
    });

    confirmar.addEventListener('click', function () {
        if (!validar()) {
            resumen.hidden = true;
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        ultimosDatos = recoger();
        ultimoMensaje = construirMensaje(ultimosDatos);
        var enlace = T.wa(ultimoMensaje);
        waFallback.href = enlace;
        waFallback.hidden = false;
        waStatus.className = 'wa-status';
        waStatus.textContent = 'Abriendo WhatsApp… si no se abre, usa el enlace manual.';
        w.open(enlace, '_blank', 'noopener');

        registrar(ultimosDatos, ultimoMensaje).then(function (codigo) {
            waStatus.className = 'wa-status is-ok';
            if (codigo) {
                waStatus.textContent = 'Solicitud registrada con código ' + codigo + '. Estado: pendiente de confirmación. Te escribiremos para confirmar.';
            } else {
                waStatus.textContent = 'Mensaje listo en WhatsApp. Tu solicitud está pendiente de confirmación; el personal te responderá por ese medio.';
            }
        });
    });

    /* ---------- Arranque ---------- */
    T.listo().then(function () {
        servicios = T.servicios();
        tipos = T.tipos();
        tiposCabana = T.tiposCabana();

        f.fecha.min = hoyISO();
        if (f.noches) f.noches.min = '1';

        if (privacy) {
            privacy.textContent = usarSupabase
                ? 'Tu solicitud queda registrada como pendiente en nuestro sistema y la confirma manualmente el personal autorizado. También se abre en WhatsApp.'
                : 'Este sitio no guarda datos en un servidor: tu solicitud se abre directamente en WhatsApp y la confirma manualmente el personal autorizado.';
        }

        if (!servicios.length) throw new Error('sin servicios publicados');
        renderServicios();
        T.aplicarEnlaces();

        cargarTiposCabanaRemotos().then(function (remotos) {
            if (remotos && remotos.length) {
                tiposCabana = remotos;
                if (currentServicio && currentServicio.id === 'cabanas') llenarAlojamientos();
            }
        });
    }).catch(function () {
        form.hidden = true;
        if (fallback) fallback.hidden = false;
    });
})(window, document);
