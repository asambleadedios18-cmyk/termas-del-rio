/* Módulo · Solicitudes web */
import { rpc, seleccionar, insertar, actualizar, eliminar } from '../db.js';
import {
    esc, num, tag, estadoTexto, fechaCorta, fechaMedia, hoyISO, addDays, diffDays,
    money, qs, qsa, modal, toast, confirmar, formData, abrirWhatsApp, abrirCorreo,
    renderPlantilla, fechaHora, METODOS_PAGO, descargarCSV
} from '../util.js';
import { icon } from '../icons.js';

export const meta = {
    id: 'solicitudes',
    title: 'Solicitudes web',
    eyebrow: 'Operación',
    icon: icon('inbox'),
    roles: ['admin', 'recepcion', 'consulta'],
};

let cache = { filas: [], tipos: [], cabanas: [], tarifas: [], huespedes: [] };
let filtros = { texto: '', estado: 'nueva', tipo: '' };

export async function render(el, ctx, params) {
    filtros = { texto: '', estado: params?.get('estado') || '', tipo: '' };
    await cargar();
    el.innerHTML = plantilla(ctx);
    pintar(ctx);
    bind(ctx);
    await ctx.recargarAvisos();

    const abrir = params?.get('abrir');
    if (abrir) await abrirDetalle(ctx, abrir);
}

async function cargar() {
    const [filas, tipos, cabanas, tarifas, huespedes] = await Promise.all([
        seleccionar('solicitudes', {
            select: '*, tipo_cabana:tipos_cabana(id,nombre)',
            order: { col: 'created_at', asc: false },
            limit: 400
        }),
        seleccionar('tipos_cabana', { order: { col: 'orden', asc: true } }),
        seleccionar('cabanas', { order: { col: 'codigo', asc: true } }),
        seleccionar('tarifas', { eq: { activo: true }, order: { col: 'vigente_desde', asc: false } }),
        seleccionar('huespedes', { order: { col: 'nombre_completo', asc: true }, limit: 800 }),
    ]);
    cache = {
        filas: filas || [], tipos: tipos || [], cabanas: cabanas || [],
        tarifas: tarifas || [], huespedes: huespedes || []
    };
}

function plantilla(ctx) {
    const nuevas = cache.filas.filter(s => s.estado === 'nueva').length;
    return `
    <div class="page-head">
        <div class="page-head__text">
            <p class="eyebrow">Operación</p>
            <h2>Bandeja de solicitudes</h2>
            <p>${resumenNuevas(nuevas)} · Las solicitudes web no son reservaciones hasta que el personal las confirme.</p>
        </div>
        <div class="page-head__actions">
            <button class="btn btn--ghost" id="btn-exportar-sol">${icon('download')} Exportar CSV</button>
        </div>
    </div>

    <section class="card">
        <div class="toolbar">
            <label class="field field--grow"><span>Buscar</span>
                <input id="s-texto" type="search" placeholder="Código, nombre, teléfono o correo" value="${esc(filtros.texto)}">
            </label>
            <label class="field"><span>Estado</span>
                <select id="s-estado">
                    <option value="">Todas</option>
                    ${['nueva', 'en_revision', 'aprobada', 'rechazada', 'convertida'].map(s =>
                        `<option value="${s}" ${filtros.estado === s ? 'selected' : ''}>${esc(estadoTexto(s))}</option>`).join('')}
                </select>
            </label>
            <label class="field"><span>Tipo</span>
                <select id="s-tipo">
                    <option value="">Todos</option>
                    ${['hospedaje', 'visita-dia', 'canopy', 'grupos', 'piscinas', 'restaurante', 'eventos', 'paquetes'].map(t =>
                        `<option value="${t}" ${filtros.tipo === t ? 'selected' : ''}>${esc(t.replace('-', ' '))}</option>`).join('')}
                </select>
            </label>
        </div>
        <div class="table-wrap">
            <table class="data data--cards" id="tabla-solicitudes">
                <thead><tr>
                    <th>Recibida</th><th>Solicitante</th><th>Tipo</th><th>Fechas</th>
                    <th>Personas</th><th>Estado</th><th class="right">Acciones</th>
                </tr></thead>
                <tbody id="tbody-solicitudes"></tbody>
            </table>
        </div>
    </section>`;
}

function resumenNuevas(n) { return `${n} nueva${n === 1 ? '' : 's'} por atender`; }

function pintar(ctx) {
    const tbody = qs('#tbody-solicitudes');
    if (!tbody) return;
    const filas = cache.filas.filter(s => {
        if (filtros.estado && s.estado !== filtros.estado) return false;
        if (filtros.tipo && s.tipo !== filtros.tipo) return false;
        if (filtros.texto) {
            const blob = [s.codigo, s.nombre, s.telefono, s.email, s.mensaje].join(' ').toLowerCase();
            if (!blob.includes(filtros.texto)) return false;
        }
        return true;
    });

    if (!filas.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No hay solicitudes con esos filtros.</td></tr>`;
        return;
    }

    tbody.innerHTML = filas.map(s => `
        <tr>
            <td data-label="Recibida"><span class="strong">${esc(fechaCorta((s.created_at || '').slice(0, 10)))}</span><span class="sub">${esc((s.created_at || '').slice(11, 16))} · ${esc(s.origen)}</span></td>
            <td data-label="Solicitante"><span class="strong">${esc(s.nombre)}</span><span class="sub">${esc(s.telefono)}${s.email ? ` · ${esc(s.email)}` : ''}</span></td>
            <td data-label="Tipo">${esc(String(s.tipo || '').replace('-', ' '))}<span class="sub">${esc(s.tipo_cabana?.nombre || '')}</span></td>
            <td data-label="Fechas">${s.fecha_entrada ? `${esc(fechaCorta(s.fecha_entrada))} → ${esc(fechaCorta(s.fecha_salida))}` : '<span class="muted">Sin fechas</span>'}<span class="sub">${s.fecha_entrada ? `${diffDays(s.fecha_entrada, s.fecha_salida)} noches` : ''}</span></td>
            <td data-label="Personas">${num(s.adultos)} + ${num(s.ninos)}<span class="sub">adultos + niños</span></td>
            <td data-label="Estado">${tag(s.estado)}<span class="sub">${esc(s.codigo)}</span></td>
            <td data-label="Acciones"><div class="actions">
                <button class="btn btn--ghost btn--sm" data-accion="ver" data-id="${s.id}">${icon('eye')} Revisar</button>
                ${ctx.esStaff && ['nueva', 'en_revision', 'aprobada'].includes(s.estado) ? `<button class="btn btn--gold btn--sm" data-accion="convertir" data-id="${s.id}">Convertir</button>` : ''}
            </div></td>
        </tr>`).join('');
}

function bind(ctx) {
    qs('#s-texto')?.addEventListener('input', (e) => { filtros.texto = e.target.value.trim().toLowerCase(); pintar(ctx); });
    qs('#s-estado')?.addEventListener('change', (e) => { filtros.estado = e.target.value; pintar(ctx); });
    qs('#s-tipo')?.addEventListener('change', (e) => { filtros.tipo = e.target.value; pintar(ctx); });
    qs('#btn-exportar-sol')?.addEventListener('click', exportar);

    qs('#tabla-solicitudes')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const s = cache.filas.find(x => x.id === btn.dataset.id);
        if (!s) return;
        if (btn.dataset.accion === 'ver') abrirDetalle(ctx, s.id);
        if (btn.dataset.accion === 'convertir' && ctx.esStaff) abrirConversion(ctx, s);
    });
}

/* ============================================================
   Detalle de solicitud
   ============================================================ */
async function abrirDetalle(ctx, id) {
    const s = cache.filas.find(x => x.id === id);
    if (!s) return;

    let disponibles = [];
    if (s.fecha_entrada && s.fecha_salida && s.tipo_cabana_id) {
        try {
            disponibles = await rpc('cabanas_disponibles', {
                p_desde: s.fecha_entrada,
                p_hasta: s.fecha_salida,
                p_tipo_id: s.tipo_cabana_id
            });
        } catch { /* sin disponibilidad calculada */ }
    }

    const puede = ctx.esStaff;
    const abierta = ['nueva', 'en_revision', 'aprobada'].includes(s.estado);

    modal.open({
        title: `Solicitud ${s.codigo}`,
        wide: true,
        body: `
        <div class="detail-banner">
            ${tag(s.estado)}
            <span class="small muted">Recibida ${esc(fechaHora(s.created_at))} · origen ${esc(s.origen)}</span>
            ${s.consentimiento ? '<span class="tag tag--confirmada">Consentimiento otorgado</span>' : ''}
        </div>
        <div class="grid grid--2">
            <div>
                <h3 style="margin-bottom:.6rem">Datos del solicitante</h3>
                <dl class="kv">
                    <dt>Nombre</dt><dd><strong>${esc(s.nombre)}</strong></dd>
                    <dt>Teléfono</dt><dd>${esc(s.telefono)}</dd>
                    <dt>Correo</dt><dd>${esc(s.email || '—')}</dd>
                    <dt>País</dt><dd>${esc(s.pais || '—')}</dd>
                    <dt>Tipo</dt><dd>${esc(String(s.tipo || '').replace('-', ' '))}</dd>
                    <dt>Cabaña</dt><dd>${esc(s.tipo_cabana?.nombre || 'No especificada')}</dd>
                    <dt>Llegada</dt><dd>${s.fecha_entrada ? esc(fechaMedia(s.fecha_entrada)) : '—'}</dd>
                    <dt>Salida</dt><dd>${s.fecha_salida ? esc(fechaMedia(s.fecha_salida)) : '—'}</dd>
                    <dt>Personas</dt><dd>${num(s.adultos)} adultos${num(s.ninos) ? `, ${num(s.ninos)} niños` : ''}</dd>
                </dl>
                <h3 style="margin:1.2rem 0 .5rem">Mensaje</h3>
                <p style="background:var(--hueso);border:1px solid var(--linea);border-radius:9px;padding:.7rem;font-size:.82rem;white-space:pre-wrap">${esc(s.mensaje || 'Sin mensaje adicional.')}</p>
            </div>
            <div>
                <h3 style="margin-bottom:.6rem">Disponibilidad</h3>
                ${s.fecha_entrada && s.tipo_cabana_id
                    ? (disponibles.length
                        ? `<div class="detail-banner" style="background:#eef8f5;border-color:#c5e5e1;margin-bottom:.6rem">
                               <strong style="color:#1f6f6a">${disponibles.length} cabaña(s) disponible(s)</strong>
                               <span class="small muted">${esc(disponibles.map(c => c.codigo).join(', '))}</span>
                           </div>`
                        : `<div class="detail-banner" style="background:var(--rojo-100);border-color:#f0cfcc;margin-bottom:.6rem">
                               <strong style="color:var(--rojo)">Sin disponibilidad</strong>
                               <span class="small muted">No hay cabañas de ese tipo libres en las fechas solicitadas.</span>
                           </div>`)
                    : '<p class="small muted">La solicitud no incluye fechas y tipo de cabaña; verifica manualmente con el cliente.</p>'}

                <h3 style="margin:1.2rem 0 .5rem">Comunicación</h3>
                <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                    <button class="btn btn--ghost btn--sm" data-sol-notif="whatsapp">${icon('whatsapp')} WhatsApp</button>
                    ${s.email ? `<button class="btn btn--ghost btn--sm" data-sol-notif="email">${icon('mail')} Correo</button>` : ''}
                </div>

                <h3 style="margin:1.2rem 0 .5rem">Notas internas</h3>
                <textarea id="sol-notas" style="width:100%;min-height:90px;border:1px solid var(--linea);border-radius:8px;padding:.55rem;font-size:.8rem" placeholder="Notas para el equipo">${esc(s.notas_admin || '')}</textarea>
                ${puede ? `<button class="btn btn--ghost btn--sm" style="margin-top:.4rem" data-guardar-notas>Guardar notas</button>` : ''}
            </div>
        </div>`,
        footer: `
            <button type="button" class="btn btn--ghost" data-cerrar>Cerrar</button>
            ${puede && s.estado === 'nueva' ? `<button type="button" class="btn btn--ghost" data-estado="en_revision">Marcar en revisión</button>` : ''}
            ${puede && abierta ? `<button type="button" class="btn btn--danger" data-estado="rechazada">Rechazar</button>` : ''}
            ${puede && abierta ? `<button type="button" class="btn btn--primary" data-convertir>${icon('arrow')} Convertir en reservación</button>` : ''}
        `
    });

    const foot = qs('#modal-foot');
    const body = qs('#modal-body');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);

    qsa('[data-sol-notif]', body).forEach(btn => btn.addEventListener('click', () => notificarSolicitud(ctx, s, btn.dataset.solNotif)));

    qs('[data-guardar-notas]', body)?.addEventListener('click', async () => {
        try {
            await actualizar('solicitudes', { notas_admin: qs('#sol-notas').value || null }, { id: s.id });
            toast('Notas guardadas.', 'ok');
        } catch (error) { toast(error.message, 'error'); }
    });

    qsa('[data-estado]', foot).forEach(btn => btn.addEventListener('click', async () => {
        const nuevo = btn.dataset.estado;
        if (nuevo === 'rechazada') {
            modal.close();
            return confirmar({
                title: `Rechazar ${s.codigo}`,
                message: 'La solicitud se conserva en el historial. Puedes avisar al cliente por WhatsApp o correo.',
                confirmText: 'Rechazar solicitud',
                danger: true,
                onConfirm: async () => {
                    try {
                        await actualizar('solicitudes', {
                            estado: 'rechazada',
                            atendida_por: ctx.session?.user?.id || null,
                            atendida_at: new Date().toISOString()
                        }, { id: s.id });
                        toast('Solicitud rechazada.', 'ok');
                        await recargar(ctx);
                    } catch (error) { toast(error.message, 'error'); }
                }
            });
        }
        try {
            await actualizar('solicitudes', {
                estado: nuevo,
                atendida_por: ctx.session?.user?.id || null,
                atendida_at: new Date().toISOString()
            }, { id: s.id });
            toast('Solicitud actualizada.', 'ok');
            modal.close();
            await recargar(ctx);
        } catch (error) { toast(error.message, 'error'); }
    }));

    qs('[data-convertir]', foot)?.addEventListener('click', () => {
        modal.close();
        abrirConversion(ctx, s);
    });
}

function notificarSolicitud(ctx, s, canal) {
    const datos = {
        huesped: s.nombre,
        codigo: s.codigo,
        tipo: s.tipo_cabana?.nombre || s.tipo,
        entrada: s.fecha_entrada ? fechaMedia(s.fecha_entrada) : 'por definir',
        salida: s.fecha_salida ? fechaMedia(s.fecha_salida) : 'por definir',
        noches: s.fecha_entrada && s.fecha_salida ? diffDays(s.fecha_entrada, s.fecha_salida) : '',
        adultos: s.adultos,
        ninos: s.ninos,
        negocio: ctx.nombreNegocio(),
        telefono: ctx.ajustes.negocio?.telefono || '',
        email: ctx.ajustes.negocio?.email || '',
    };
    const texto = renderPlantilla(ctx.plantilla('solicitud_recibida') || '', datos);
    if (canal === 'whatsapp') abrirWhatsApp(s.telefono, texto);
    else abrirCorreo(s.email, `${ctx.nombreNegocio()} · Solicitud ${s.codigo}`, texto);
}

/* ============================================================
   Conversión a reservación
   ============================================================ */
function abrirConversion(ctx, s) {
    const hoy = hoyISO();
    const entrada = s.fecha_entrada || hoy;
    const salida = s.fecha_salida || addDays(entrada, 1);
    const tipos = cache.tipos.filter(t => t.activo);
    const tipoPref = s.tipo_cabana_id || tipos[0]?.id || '';

    const { body } = modal.open({
        title: `Convertir solicitud ${s.codigo}`,
        wide: true,
        body: `
        <div class="detail-banner" style="margin-bottom:.9rem">
            <span><span class="muted small">Solicitante</span><br><strong>${esc(s.nombre)}</strong></span>
            <span><span class="muted small">Teléfono</span><br><strong>${esc(s.telefono)}</strong></span>
            <span><span class="muted small">Solicitud</span><br><strong>${esc(s.codigo)}</strong></span>
        </div>
        <form id="form-convertir" class="form">
            <div class="form-grid form-grid--3">
                <label class="field"><span>Tipo de cabaña *</span>
                    <select name="tipo_id" id="c-tipo" required>
                        ${tipos.map(t => `<option value="${t.id}" ${tipoPref === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
                    </select>
                </label>
                <label class="field"><span>Fecha de entrada *</span><input name="fecha_entrada" id="c-entrada" type="date" required value="${esc(entrada)}"></label>
                <label class="field"><span>Fecha de salida *</span><input name="fecha_salida" id="c-salida" type="date" required value="${esc(salida)}" min="${esc(addDays(entrada, 1))}"></label>
                <label class="field"><span>Cabaña disponible *</span><select name="cabana_id" id="c-cabana" required><option value="">Buscando…</option></select></label>
                <label class="field"><span>Adultos *</span><input name="adultos" type="number" min="1" step="1" value="${Math.max(1, num(s.adultos))}" required></label>
                <label class="field"><span>Niños</span><input name="ninos" type="number" min="0" step="1" value="${num(s.ninos)}"></label>
                <label class="field"><span>Tarifa por noche (L) *</span><input name="tarifa_noche" id="c-tarifa" type="number" min="0" step="0.01" required></label>
                <label class="field"><span>Descuento (L)</span><input name="descuento" id="c-descuento" type="number" min="0" step="0.01" value="0"></label>
                <label class="field"><span>Estado al crear</span>
                    <select name="estado">
                        <option value="confirmada">Confirmada</option>
                        <option value="pendiente">Pendiente</option>
                    </select>
                </label>
            </div>
            <label class="field"><span>Observaciones</span><textarea name="observaciones" placeholder="Solicitud original: ${esc((s.mensaje || '').slice(0, 140))}">${esc(s.mensaje || '')}</textarea></label>
            <div class="detail-banner" style="margin:0">
                <span><span class="muted small">Noches</span><br><strong id="cc-noches">—</strong></span>
                <span><span class="muted small">Total estimado</span><br><strong id="cc-total">—</strong></span>
                <span class="small muted">El huésped se busca por teléfono; si no existe se crea automáticamente.</span>
            </div>
            <p class="form__error" id="c-error" hidden></p>
        </form>`,
        footer: `<button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button type="button" class="btn btn--primary" id="c-guardar">Crear reservación</button>`
    });

    const form = qs('#form-convertir', body);
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);

    const actualizarCabanas = async () => {
        const tipo = form.tipo_id.value;
        const desde = form.fecha_entrada.value;
        const hasta = form.fecha_salida.value;
        if (!tipo || !desde || !hasta || hasta <= desde) {
            form.cabana_id.innerHTML = '<option value="">Fechas no válidas</option>';
            return;
        }
        form.cabana_id.innerHTML = '<option value="">Buscando…</option>';
        try {
            const libres = await rpc('cabanas_disponibles', { p_desde: desde, p_hasta: hasta, p_tipo_id: tipo });
            form.cabana_id.innerHTML = (libres || []).length
                ? `<option value="">Selecciona cabaña…</option>` + libres.map(c =>
                    `<option value="${c.id}">${esc(c.codigo)} · ${esc(c.tipo_nombre)}</option>`).join('')
                : '<option value="">Sin disponibilidad en esas fechas</option>';
        } catch (error) {
            form.cabana_id.innerHTML = `<option value="">${esc(error.message)}</option>`;
        }
    };

    const tarifa = () => {
        const fecha = form.fecha_entrada.value || hoy;
        const t = cache.tarifas
            .filter(x => x.tipo_id === form.tipo_id.value && x.activo && x.vigente_desde <= fecha && (!x.vigente_hasta || x.vigente_hasta >= fecha))
            .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
        if (t) form.tarifa_noche.value = Number(t.precio_noche).toFixed(2);
    };

    const calcular = () => {
        const n = diffDays(form.fecha_entrada.value, form.fecha_salida.value);
        const total = Math.max(0, n * num(form.tarifa_noche.value) - num(form.descuento.value));
        qs('#cc-noches', body).textContent = n > 0 ? `${n} noches` : '—';
        qs('#cc-total', body).textContent = n > 0 ? money(total) : '—';
        form.fecha_salida.min = form.fecha_entrada.value ? addDays(form.fecha_entrada.value, 1) : hoy;
    };

    form.tipo_id.addEventListener('change', () => { actualizarCabanas(); tarifa(); calcular(); });
    form.fecha_entrada.addEventListener('change', () => { actualizarCabanas(); tarifa(); calcular(); });
    form.fecha_salida.addEventListener('change', () => { actualizarCabanas(); calcular(); });
    form.tarifa_noche.addEventListener('input', calcular);
    form.descuento.addEventListener('input', calcular);

    actualizarCabanas();
    tarifa();
    calcular();

    qs('#c-guardar', foot).addEventListener('click', async (e) => {
        if (!form.reportValidity()) return;
        const data = formData(form);
        const errorEl = qs('#c-error', body);
        errorEl.hidden = true;
        if (!data.cabana_id) {
            errorEl.textContent = 'Selecciona una cabaña disponible.';
            errorEl.hidden = false;
            return;
        }
        if (diffDays(data.fecha_entrada, data.fecha_salida) <= 0) {
            errorEl.textContent = 'La salida debe ser posterior a la entrada.';
            errorEl.hidden = false;
            return;
        }
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Creando…';
        try {
            let huesped = cache.huespedes.find(h => (h.telefono || '').replace(/\D/g, '') === (s.telefono || '').replace(/\D/g, ''));
            if (!huesped) {
                const nuevo = await insertar('huespedes', {
                    nombre_completo: s.nombre,
                    telefono: s.telefono,
                    email: s.email || null,
                    pais: s.pais || 'Honduras',
                    created_by: ctx.session?.user?.id || null
                });
                huesped = nuevo?.[0];
            }
            if (!huesped) throw new Error('No se pudo registrar el huésped.');

            const res = await rpc('crear_reservacion', {
                p_huesped_id: huesped.id,
                p_cabana_id: data.cabana_id,
                p_fecha_entrada: data.fecha_entrada,
                p_fecha_salida: data.fecha_salida,
                p_adultos: num(data.adultos),
                p_ninos: num(data.ninos),
                p_tarifa_noche: num(data.tarifa_noche),
                p_descuento: num(data.descuento),
                p_estado: data.estado,
                p_origen: 'web',
                p_observaciones: data.observaciones || null,
                p_solicitud_id: s.id
            });

            modal.close();
            toast(`Reservación ${res.codigo} creada desde la solicitud.`, 'ok');
            await recargar(ctx);

            const r = {
                ...res,
                huesped_nombre: s.nombre, huesped_telefono: s.telefono, huesped_email: s.email,
                cabana_codigo: cache.cabanas.find(c => c.id === data.cabana_id)?.codigo || '',
                tipo_nombre: cache.tipos.find(t => t.id === data.tipo_id)?.nombre || '',
                fecha_entrada: data.fecha_entrada, fecha_salida: data.fecha_salida,
                noches: diffDays(data.fecha_entrada, data.fecha_salida),
                adultos: num(data.adultos), ninos: num(data.ninos),
                total: res.total, pagado: 0, saldo: res.total
            };
            const texto = renderPlantilla(ctx.plantilla('confirmada') || '', {
                huesped: r.huesped_nombre, codigo: r.codigo, cabana: r.cabana_codigo,
                tipo: r.tipo_nombre, entrada: fechaMedia(r.fecha_entrada), salida: fechaMedia(r.fecha_salida),
                noches: r.noches, adultos: r.adultos, ninos: r.ninos, total: money(r.total),
                anticipo: money(0), saldo: money(r.total),
                instrucciones_pago: ctx.ajustes.pago_instrucciones?.texto || '',
                negocio: ctx.nombreNegocio(), telefono: ctx.ajustes.negocio?.telefono || '',
                email: ctx.ajustes.negocio?.email || '',
            });
            confirmar({
                title: 'Reservación creada',
                message: `${res.codigo} quedó registrada. ¿Deseas enviar la confirmación al huésped por WhatsApp?`,
                confirmText: 'Enviar por WhatsApp',
                onConfirm: () => abrirWhatsApp(s.telefono, texto)
            });
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.hidden = false;
            e.currentTarget.disabled = false;
            e.currentTarget.textContent = 'Crear reservación';
        }
    });
}

/* ============================================================
   Recarga y exportación
   ============================================================ */
async function recargar(ctx) {
    await cargar();
    await ctx.recargarAvisos();
    const cont = qs('#contenido-admin');
    if (cont && location.hash.startsWith('#/solicitudes')) {
        cont.innerHTML = plantilla(ctx);
        pintar(ctx);
        bind(ctx);
    }
}

function exportar() {
    const filas = cache.filas.filter(s => {
        if (filtros.estado && s.estado !== filtros.estado) return false;
        if (filtros.tipo && s.tipo !== filtros.tipo) return false;
        if (filtros.texto) {
            const blob = [s.codigo, s.nombre, s.telefono, s.email, s.mensaje].join(' ').toLowerCase();
            if (!blob.includes(filtros.texto)) return false;
        }
        return true;
    });
    descargarCSV(`solicitudes-${hoyISO()}.csv`, filas, [
        { label: 'Código', key: 'codigo' },
        { label: 'Recibida', key: 'created_at' },
        { label: 'Estado', value: s => estadoTexto(s.estado) },
        { label: 'Tipo', key: 'tipo' },
        { label: 'Nombre', key: 'nombre' },
        { label: 'Teléfono', key: 'telefono' },
        { label: 'Correo', key: 'email' },
        { label: 'País', key: 'pais' },
        { label: 'Entrada', key: 'fecha_entrada' },
        { label: 'Salida', key: 'fecha_salida' },
        { label: 'Adultos', key: 'adultos' },
        { label: 'Niños', key: 'ninos' },
        { label: 'Mensaje', key: 'mensaje' },
    ]);
}
