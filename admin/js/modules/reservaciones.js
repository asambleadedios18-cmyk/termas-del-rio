/* Módulo · Reservaciones */
import { rpc, seleccionar, insertar, actualizar, eliminar } from '../db.js';
import {
    esc, money, moneyShort, num, tag, estadoTexto, fechaCorta, fechaMedia, fechaLarga,
    hoyISO, addDays, diffDays, plural, qs, qsa, modal, toast, confirmar,
    formData, descargarCSV, ORIGENES, METODOS_PAGO, abrirWhatsApp, abrirCorreo,
    renderPlantilla, horaTexto, fechaHora
} from '../util.js';
import { icon } from '../icons.js';

export const meta = {
    id: 'reservaciones',
    title: 'Reservaciones',
    eyebrow: 'Operación',
    icon: icon('calendar'),
    roles: ['admin', 'recepcion', 'consulta'],
};

let cache = { filas: [], huespedes: [], tipos: [], cabanas: [], tarifas: [] };
let filtros = { texto: '', estado: '', pago: '', desde: '', hasta: '' };

export async function render(el, ctx, params) {
    const estadoParam = params?.get('estado') || '';
    filtros = { texto: '', estado: estadoParam, pago: '', desde: '', hasta: '' };

    await cargarTodo(ctx);
    el.innerHTML = plantilla(ctx);
    pintar(ctx);

    qs('#f-texto')?.addEventListener('input', (e) => {
        filtros.texto = e.target.value.trim().toLowerCase();
        pintar(ctx);
    });
    qs('#f-estado')?.addEventListener('change', (e) => { filtros.estado = e.target.value; pintar(ctx); });
    qs('#f-pago')?.addEventListener('change', (e) => { filtros.pago = e.target.value; pintar(ctx); });
    qs('#f-desde')?.addEventListener('change', (e) => { filtros.desde = e.target.value; pintar(ctx); });
    qs('#f-hasta')?.addEventListener('change', (e) => { filtros.hasta = e.target.value; pintar(ctx); });
    qs('#btn-limpiar')?.addEventListener('click', () => {
        filtros = { texto: '', estado: '', pago: '', desde: '', hasta: '' };
        qsa('.toolbar input, .toolbar select').forEach(x => { if (x.id !== 'f-texto') x.value = ''; });
        qs('#f-texto').value = '';
        pintar(ctx);
    });
    qs('#btn-nueva')?.addEventListener('click', () => abrirFormulario(ctx));
    qs('#btn-exportar')?.addEventListener('click', () => exportar(ctx));

    qs('#tabla-reservas')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.accion === 'ver') abrirDetalle(ctx, id);
        if (btn.dataset.accion === 'editar' && ctx.esStaff) abrirFormulario(ctx, cache.filas.find(r => r.id === id));
        if (btn.dataset.accion === 'confirmar' && ctx.esStaff) cambiarEstado(ctx, id, 'confirmada');
        if (btn.dataset.accion === 'cancelar' && ctx.esStaff) cancelarReserva(ctx, id);
        if (btn.dataset.accion === 'pago' && ctx.esStaff) abrirPago(ctx, id);
    });

    if (params?.get('ver')) {
        await abrirDetalle(ctx, params.get('ver'));
    }
    if (params?.get('nueva') === '1' && ctx.esStaff) {
        abrirFormulario(ctx, null, {
            entrada: params.get('entrada') || '',
            cabana: params.get('cabana') || ''
        });
    }
}

async function cargarTodo() {
    const [filas, huespedes, tipos, cabanas, tarifas] = await Promise.all([
        seleccionar('v_reservaciones_detalle', {
            order: [{ col: 'fecha_entrada', asc: false }, { col: 'created_at', asc: false }],
            limit: 500
        }),
        seleccionar('huespedes', { order: { col: 'nombre_completo', asc: true }, limit: 800 }),
        seleccionar('tipos_cabana', { order: { col: 'orden', asc: true } }),
        seleccionar('cabanas', { order: { col: 'codigo', asc: true } }),
        seleccionar('tarifas', { eq: { activo: true }, order: { col: 'vigente_desde', asc: false } }),
    ]);
    cache = { filas: filas || [], huespedes: huespedes || [], tipos: tipos || [], cabanas: cabanas || [], tarifas: tarifas || [] };
}

function plantilla(ctx) {
    const activas = cache.filas.filter(r => ['pendiente', 'confirmada'].includes(r.estado));
    const pendientes = cache.filas.filter(r => r.estado === 'pendiente').length;
    const porCobrar = activas.reduce((s, r) => s + Math.max(0, num(r.saldo)), 0);

    return `
    <div class="page-head">
        <div class="page-head__text">
            <p class="eyebrow">Operación</p>
            <h2>Reservaciones</h2>
            <p>${cache.filas.length} registros · ${pendientes} pendientes · ${esc(money(porCobrar))} por cobrar</p>
        </div>
        <div class="page-head__actions">
            <button class="btn btn--ghost" id="btn-exportar">${icon('download')} Exportar CSV</button>
            ${ctx.esStaff ? `<button class="btn btn--primary" id="btn-nueva">${icon('plus')} Nueva reservación</button>` : ''}
        </div>
    </div>

    <section class="card">
        <div class="toolbar">
            <label class="field field--grow"><span>Buscar</span>
                <input id="f-texto" type="search" placeholder="Código, huésped, teléfono o cabaña" value="${esc(filtros.texto)}">
            </label>
            <label class="field"><span>Estado</span>
                <select id="f-estado">
                    <option value="">Todos</option>
                    ${['pendiente', 'confirmada', 'completada', 'cancelada', 'no_show'].map(s =>
                        `<option value="${s}" ${filtros.estado === s ? 'selected' : ''}>${esc(estadoTexto(s))}</option>`).join('')}
                </select>
            </label>
            <label class="field"><span>Pago</span>
                <select id="f-pago">
                    <option value="">Todos</option>
                    ${['pendiente', 'parcial', 'pagado'].map(s =>
                        `<option value="${s}" ${filtros.pago === s ? 'selected' : ''}>${esc(estadoTexto(s))}</option>`).join('')}
                </select>
            </label>
            <label class="field"><span>Entrada desde</span><input id="f-desde" type="date" value="${esc(filtros.desde)}"></label>
            <label class="field"><span>Entrada hasta</span><input id="f-hasta" type="date" value="${esc(filtros.hasta)}"></label>
            <button class="btn btn--ghost btn--sm" id="btn-limpiar">Limpiar</button>
        </div>
        <div class="table-wrap">
            <table class="data data--cards" id="tabla-reservas">
                <thead><tr>
                    <th>Código</th><th>Huésped</th><th>Cabaña</th><th>Fechas</th>
                    <th>Personas</th><th>Total</th><th>Pago</th><th>Estado</th><th class="right">Acciones</th>
                </tr></thead>
                <tbody id="tbody-reservas"></tbody>
            </table>
        </div>
    </section>`;
}

function filasFiltradas() {
    return cache.filas.filter(r => {
        if (filtros.estado && r.estado !== filtros.estado) return false;
        if (filtros.pago && r.estado_pago !== filtros.pago) return false;
        if (filtros.desde && r.fecha_entrada < filtros.desde) return false;
        if (filtros.hasta && r.fecha_entrada > filtros.hasta) return false;
        if (filtros.texto) {
            const blob = [r.codigo, r.huesped_nombre, r.huesped_telefono, r.huesped_email, r.cabana_codigo, r.tipo_nombre]
                .join(' ').toLowerCase();
            if (!blob.includes(filtros.texto)) return false;
        }
        return true;
    });
}

function pintar(ctx) {
    const filas = filasFiltradas();
    const tbody = qs('#tbody-reservas');
    if (!tbody) return;

    if (!filas.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9">No hay reservaciones con esos filtros.</td></tr>`;
        return;
    }

    tbody.innerHTML = filas.map(r => `
        <tr>
            <td data-label="Código"><span class="strong">${esc(r.codigo)}</span><span class="sub">${esc(ORIGENES[r.origen] || r.origen || '')}</span></td>
            <td data-label="Huésped"><span class="strong">${esc(r.huesped_nombre)}</span><span class="sub">${esc(r.huesped_telefono || '')}</span></td>
            <td data-label="Cabaña"><span class="strong">${esc(r.cabana_codigo)}</span><span class="sub">${esc(r.tipo_nombre || '')}</span></td>
            <td data-label="Fechas"><span class="strong">${esc(fechaCorta(r.fecha_entrada))} → ${esc(fechaCorta(r.fecha_salida))}</span><span class="sub">${num(r.noches)} ${num(r.noches) === 1 ? 'noche' : 'noches'}</span></td>
            <td data-label="Personas">${num(r.adultos)} + ${num(r.ninos)}<span class="sub">adultos + niños</span></td>
            <td data-label="Total"><span class="strong">${esc(money(r.total))}</span><span class="sub">${esc(money(r.tarifa_noche))}/noche</span></td>
            <td data-label="Pago">${tag(r.estado_pago)}<span class="sub">${esc(money(r.pagado))} pagado</span></td>
            <td data-label="Estado">${tag(r.estado)}</td>
            <td data-label="Acciones">
                <div class="actions">
                    <button class="btn btn--ghost btn--sm" data-accion="ver" data-id="${r.id}" title="Ver detalle">${icon('eye')}</button>
                    ${ctx.esStaff ? `<button class="btn btn--ghost btn--sm" data-accion="editar" data-id="${r.id}" title="Editar">${icon('edit')}</button>` : ''}
                    ${ctx.esStaff && r.estado === 'pendiente' ? `<button class="btn btn--gold btn--sm" data-accion="confirmar" data-id="${r.id}">Confirmar</button>` : ''}
                    ${ctx.esStaff && ['pendiente', 'confirmada'].includes(r.estado) ? `<button class="btn btn--ghost btn--sm" data-accion="pago" data-id="${r.id}" title="Registrar pago">${icon('card')}</button>` : ''}
                </div>
            </td>
        </tr>`).join('');
}

/* ============================================================
   Formulario de reservación
   ============================================================ */
async function abrirFormulario(ctx, reserva = null, prefill = {}) {
    const editando = Boolean(reserva);
    const hoy = hoyISO();
    const cabanaPref = prefill.cabana ? cache.cabanas.find(c => c.id === prefill.cabana) : null;
    const entrada = reserva?.fecha_entrada || prefill.entrada || hoy;
    const salida = reserva?.fecha_salida || addDays(entrada, 1);
    const tipoPref = reserva?.tipo_id || cabanaPref?.tipo_id || '';
    const tipos = cache.tipos.filter(t => t.activo);
    const guestOptions = cache.huespedes.map(h =>
        `<option value="${h.id}" ${reserva?.huesped_id === h.id ? 'selected' : ''}>${esc(h.nombre_completo)} · ${esc(h.telefono)}</option>`
    ).join('');

    const { body } = modal.open({
        title: editando ? `Editar reservación ${reserva.codigo}` : 'Nueva reservación',
        wide: true,
        body: `
        <form id="form-reserva" class="form" novalidate>
            ${editando ? `<div class="detail-banner">
                <span class="detail-banner__code">${esc(reserva.codigo)}</span>
                ${tag(reserva.estado)}
                <span class="small muted">Huésped: <strong>${esc(reserva.huesped_nombre)}</strong> · ${esc(reserva.huesped_telefono || '')}</span>
            </div>` : `
            <div class="form-grid">
                <label class="field span-2"><span>Huésped</span>
                    <select name="huesped_id" id="f-huesped">
                        <option value="">— Registrar nuevo huésped —</option>
                        ${guestOptions}
                    </select>
                </label>
            </div>
            <div id="bloque-huesped" class="form-grid form-grid--3">
                <label class="field"><span>Nombre completo *</span><input name="huesped_nombre" required placeholder="Nombre y apellidos"></label>
                <label class="field"><span>Teléfono / WhatsApp *</span><input name="huesped_telefono" required placeholder="+504 0000-0000"></label>
                <label class="field"><span>Correo electrónico</span><input name="huesped_email" type="email" placeholder="correo@ejemplo.com"></label>
                <label class="field"><span>Identidad (opcional)</span><input name="huesped_identidad" placeholder="DNI / pasaporte"></label>
                <label class="field"><span>País</span><input name="huesped_pais" value="Honduras"></label>
            </div>`}

            <div class="form-grid form-grid--3">
                <label class="field"><span>Tipo de cabaña *</span>
                    <select name="tipo_id" id="f-tipo" required>
                        <option value="">Selecciona…</option>
                        ${tipos.map(t => `<option value="${t.id}" ${tipoPref === t.id ? 'selected' : ''}>${esc(t.nombre)} · ${num(t.capacidad_max)} pers.</option>`).join('')}
                    </select>
                </label>
                <label class="field"><span>Cabaña *</span>
                    <select name="cabana_id" id="f-cabana" required>
                        <option value="">Selecciona fechas y tipo…</option>
                    </select>
                </label>
                <label class="field"><span>Estado inicial</span>
                    <select name="estado">
                        <option value="pendiente" ${reserva?.estado === 'pendiente' || !editando ? 'selected' : ''}>Pendiente</option>
                        <option value="confirmada" ${reserva?.estado === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                        ${editando ? ['completada', 'cancelada', 'no_show'].map(s => `<option value="${s}" ${reserva?.estado === s ? 'selected' : ''}>${esc(estadoTexto(s))}</option>`).join('') : ''}
                    </select>
                </label>
                <label class="field"><span>Fecha de entrada *</span><input name="fecha_entrada" id="f-entrada" type="date" required value="${esc(entrada)}" min="${editando ? '' : hoy}"></label>
                <label class="field"><span>Fecha de salida *</span><input name="fecha_salida" id="f-salida" type="date" required value="${esc(salida)}" min="${esc(addDays(entrada, 1))}"></label>
                <label class="field"><span>Adultos *</span><input name="adultos" id="f-adultos" type="number" min="1" step="1" value="${num(reserva?.adultos) || 1}" required></label>
                <label class="field"><span>Niños</span><input name="ninos" type="number" min="0" step="1" value="${num(reserva?.ninos) || 0}"></label>
                <label class="field"><span>Tarifa por noche (L) *</span><input name="tarifa_noche" id="f-tarifa" type="number" min="0" step="0.01" required value="${reserva ? num(reserva.tarifa_noche) : ''}" placeholder="Definida en Tarifas"></label>
                <label class="field"><span>Descuento (L)</span><input name="descuento" id="f-descuento" type="number" min="0" step="0.01" value="${num(reserva?.descuento) || 0}"></label>
                <label class="field"><span>Origen</span>
                    <select name="origen">
                        ${Object.entries(ORIGENES).map(([k, v]) => `<option value="${k}" ${(reserva?.origen || 'manual') === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
                    </select>
                </label>
            </div>

            <label class="field"><span>Observaciones</span><textarea name="observaciones" placeholder="Llegada tarde, solicitud especial, alergias, etc.">${esc(reserva?.observaciones || '')}</textarea></label>

            <div class="detail-banner" id="resumen-total" style="margin:0">
                <span><span class="muted small">Noches</span><br><strong id="calc-noches">—</strong></span>
                <span><span class="muted small">Total estimado</span><br><strong id="calc-total">—</strong></span>
                <span class="small muted" id="calc-aviso"></span>
            </div>
            <p class="form__error" id="error-reserva" hidden></p>
        </form>`,
        footer: `<button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button type="button" class="btn btn--primary" id="guardar-reserva">${editando ? 'Guardar cambios' : 'Crear reservación'}</button>`
    });

    const form = qs('#form-reserva', body);
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);

    const actualizarCabanas = async () => {
        const tipo = form.tipo_id.value;
        const desde = form.fecha_entrada.value;
        const hasta = form.fecha_salida.value;
        const select = form.cabana_id;
        select.innerHTML = '<option value="">Buscando disponibilidad…</option>';

        if (!tipo || !desde || !hasta || hasta <= desde) {
            select.innerHTML = '<option value="">Selecciona fechas válidas</option>';
            return;
        }

        try {
            const disponibles = await rpc('cabanas_disponibles', {
                p_desde: desde, p_hasta: hasta, p_tipo_id: tipo
            });
            const opciones = (disponibles || []).map(c =>
                `<option value="${c.id}" ${reserva?.cabana_id === c.id ? 'selected' : ''}>${esc(c.codigo)} · ${esc(c.tipo_nombre)}</option>`
            );
            if (editando && reserva?.cabana_id && !(disponibles || []).some(c => c.id === reserva.cabana_id)) {
                opciones.unshift(`<option value="${reserva.cabana_id}" selected>${esc(reserva.cabana_codigo)} · cabaña actual</option>`);
            }
            select.innerHTML = opciones.length
                ? `<option value="">Selecciona cabaña…</option>${opciones.join('')}`
                : `<option value="">Sin cabañas disponibles en esas fechas</option>`;

            if (editando && reserva?.cabana_id) select.value = reserva.cabana_id;
            else if (opciones.length === 1) select.value = disponibles[0].id;
        } catch (error) {
            select.innerHTML = `<option value="">Error: ${esc(error.message)}</option>`;
        }
    };

    const autocompletarTarifa = () => {
        if (!form.tipo_id.value) return;
        const fecha = form.fecha_entrada.value || hoy;
        const tarifa = cache.tarifas
            .filter(t => t.tipo_id === form.tipo_id.value && t.activo && t.vigente_desde <= fecha && (!t.vigente_hasta || t.vigente_hasta >= fecha))
            .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
        if (tarifa) form.tarifa_noche.value = Number(tarifa.precio_noche).toFixed(2);
        else if (!editando) {
            form.tarifa_noche.value = '';
            form.tarifa_noche.placeholder = 'No hay tarifa configurada';
        }
    };

    const recalcular = () => {
        const n = diffDays(form.fecha_entrada.value, form.fecha_salida.value);
        const tarifa = num(form.tarifa_noche.value);
        const desc = num(form.descuento.value);
        const total = Math.max(0, n * tarifa - desc);
        qs('#calc-noches').textContent = n > 0 ? `${n} ${n === 1 ? 'noche' : 'noches'}` : '—';
        qs('#calc-total').textContent = n > 0 ? money(total) : '—';
        form.fecha_salida.min = form.fecha_entrada.value ? addDays(form.fecha_entrada.value, 1) : hoy;
        qs('#calc-aviso').textContent = tarifa === 0 ? 'Configura la tarifa antes de confirmar.' : '';
    };

    const toggleHuesped = () => {
        const bloque = qs('#bloque-huesped', body);
        if (!bloque) return;
        bloque.hidden = Boolean(form.huesped_id.value);
    };

    form.tipo_id.addEventListener('change', () => { actualizarCabanas(); autocompletarTarifa(); recalcular(); });
    form.fecha_entrada.addEventListener('change', async () => {
        if (form.fecha_salida.value <= form.fecha_entrada.value) {
            form.fecha_salida.value = addDays(form.fecha_entrada.value, 1);
        }
        await actualizarCabanas(); autocompletarTarifa(); recalcular();
    });
    form.fecha_salida.addEventListener('change', async () => { await actualizarCabanas(); recalcular(); });
    form.tarifa_noche.addEventListener('input', recalcular);
    form.descuento.addEventListener('input', recalcular);
    form.huesped_id?.addEventListener('change', toggleHuesped);

    await actualizarCabanas();
    toggleHuesped();
    if (prefill.cabana) form.cabana_id.value = prefill.cabana;
    if (!editando) autocompletarTarifa();
    recalcular();
    if (editando && reserva?.cabana_id) form.cabana_id.value = reserva.cabana_id;

    qs('#guardar-reserva', foot).addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const errorEl = qs('#error-reserva');
        errorEl.hidden = true;

        if (!form.reportValidity()) return;
        const data = formData(form);
        if (!data.cabana_id) return mostrarError(errorEl, 'Selecciona una cabaña disponible.');
        if (!data.tarifa_noche || num(data.tarifa_noche) < 0) return mostrarError(errorEl, 'Indica la tarifa por noche.');
        const noches = diffDays(data.fecha_entrada, data.fecha_salida);
        if (noches <= 0) return mostrarError(errorEl, 'La fecha de salida debe ser posterior a la entrada.');

        btn.disabled = true;
        btn.textContent = 'Guardando…';
        try {
            const cabana = cache.cabanas.find(c => c.id === data.cabana_id);
            const tipoId = cabana?.tipo_id || data.tipo_id;

            if (editando) {
                await actualizar('reservaciones', {
                    cabana_id: data.cabana_id,
                    tipo_id: tipoId,
                    fecha_entrada: data.fecha_entrada,
                    fecha_salida: data.fecha_salida,
                    adultos: num(data.adultos),
                    ninos: num(data.ninos),
                    tarifa_noche: num(data.tarifa_noche),
                    descuento: num(data.descuento),
                    estado: data.estado,
                    observaciones: data.observaciones || null,
                    updated_by: ctx.session?.user?.id || null
                }, { id: reserva.id });
                toast('Reservación actualizada.', 'ok');
            } else {
                let huespedId = data.huesped_id;
                if (!huespedId) {
                    const nuevo = await insertar('huespedes', {
                        nombre_completo: data.huesped_nombre,
                        telefono: data.huesped_telefono,
                        email: data.huesped_email || null,
                        identidad: data.huesped_identidad || null,
                        pais: data.huesped_pais || 'Honduras',
                        created_by: ctx.session?.user?.id || null
                    });
                    huespedId = nuevo?.[0]?.id;
                }
                if (!huespedId) throw new Error('No se pudo registrar el huésped.');

                const resultado = await rpc('crear_reservacion', {
                    p_huesped_id: huespedId,
                    p_cabana_id: data.cabana_id,
                    p_fecha_entrada: data.fecha_entrada,
                    p_fecha_salida: data.fecha_salida,
                    p_adultos: num(data.adultos),
                    p_ninos: num(data.ninos),
                    p_tarifa_noche: num(data.tarifa_noche),
                    p_descuento: num(data.descuento),
                    p_estado: data.estado === 'confirmada' ? 'confirmada' : 'pendiente',
                    p_origen: data.origen,
                    p_observaciones: data.observaciones || null
                });
                toast(`Reservación ${resultado.codigo} creada.`, 'ok');
            }
            modal.close();
            await refrescar(ctx);
        } catch (error) {
            mostrarError(errorEl, String(error.message || error));
            btn.disabled = false;
            btn.textContent = editando ? 'Guardar cambios' : 'Crear reservación';
        }
    });
}

function mostrarError(el, mensaje) {
    if (!el) return toast(mensaje, 'error');
    el.textContent = mensaje;
    el.hidden = false;
}

/* ============================================================
   Detalle
   ============================================================ */
async function abrirDetalle(ctx, id) {
    const r = cache.filas.find(x => x.id === id);
    if (!r) return;

    const [pagos, notificaciones] = await Promise.all([
        seleccionar('pagos', { eq: { reservacion_id: id }, order: { col: 'fecha_pago', asc: false } }),
        seleccionar('notificaciones', { eq: { reservacion_id: id }, order: { col: 'created_at', asc: false }, limit: 10 }),
    ]);

    const saldo = num(r.total) - (pagos || []).reduce((s, p) => s + num(p.monto), 0);
    const puede = ctx.esStaff;

    modal.open({
        title: `Reservación ${r.codigo}`,
        wide: true,
        body: `
        <div class="detail-banner">
            <span class="detail-banner__code">${esc(r.codigo)}</span>
            ${tag(r.estado)} ${tag(r.estado_pago)}
            <span class="small muted">${esc(ORIGENES[r.origen] || r.origen || '')} · Creada ${esc(fechaHora(r.created_at))}</span>
        </div>

        <div class="grid grid--2">
            <div>
                <h3 style="margin-bottom:.6rem">Huésped</h3>
                <dl class="kv">
                    <dt>Nombre</dt><dd><strong>${esc(r.huesped_nombre)}</strong></dd>
                    <dt>Teléfono</dt><dd>${esc(r.huesped_telefono || '—')}</dd>
                    <dt>Correo</dt><dd>${esc(r.huesped_email || '—')}</dd>
                    <dt>Identidad</dt><dd>${esc(r.huesped_identidad || '—')}</dd>
                    <dt>País</dt><dd>${esc(r.huesped_pais || '—')}</dd>
                </dl>
                <div style="display:flex;gap:.4rem;margin-top:.8rem;flex-wrap:wrap">
                    ${r.huesped_telefono ? `<button class="btn btn--ghost btn--sm" data-notif="whatsapp">${icon('whatsapp')} WhatsApp</button>` : ''}
                    ${r.huesped_email ? `<button class="btn btn--ghost btn--sm" data-notif="email">${icon('mail')} Correo</button>` : ''}
                    <a class="btn btn--ghost btn--sm" href="#/huespedes?buscar=${encodeURIComponent(r.huesped_nombre)}" data-cerrar-detalle>Ver ficha</a>
                </div>

                <h3 style="margin:1.4rem 0 .6rem">Estancia</h3>
                <dl class="kv">
                    <dt>Llegada</dt><dd>${esc(fechaLarga(r.fecha_entrada))}</dd>
                    <dt>Salida</dt><dd>${esc(fechaLarga(r.fecha_salida))}</dd>
                    <dt>Noches</dt><dd>${num(r.noches)}</dd>
                    <dt>Cabaña</dt><dd><strong>${esc(r.cabana_codigo)}</strong> · ${esc(r.tipo_nombre)}</dd>
                    <dt>Personas</dt><dd>${num(r.adultos)} adultos${num(r.ninos) ? `, ${num(r.ninos)} niños` : ''}</dd>
                    <dt>Tarifa</dt><dd>${esc(money(r.tarifa_noche))} por noche</dd>
                    <dt>Descuento</dt><dd>${esc(money(r.descuento))}</dd>
                    <dt>Observaciones</dt><dd>${esc(r.observaciones || '—')}</dd>
                </dl>
            </div>

            <div>
                <h3 style="margin-bottom:.6rem">Pagos</h3>
                <dl class="kv" style="grid-template-columns:1fr 1fr;margin-bottom:.8rem">
                    <div><dt>Total</dt><dd><strong>${esc(money(r.total))}</strong></dd></div>
                    <div><dt>Pagado</dt><dd><strong>${esc(money(r.pagado))}</strong></dd></div>
                    <div><dt>Saldo</dt><dd><strong style="color:${saldo > 0 ? 'var(--rojo)' : 'var(--verde-600)'}">${esc(money(saldo))}</strong></dd></div>
                    <div><dt>Estado</dt><dd>${tag(r.estado_pago)}</dd></div>
                </dl>
                ${pagos?.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Fecha</th><th>Método</th><th>Monto</th><th></th></tr></thead><tbody>
                    ${pagos.map(p => `<tr>
                        <td>${esc(fechaMedia(p.fecha_pago))}<span class="sub">${esc(p.referencia || '')}</span></td>
                        <td>${esc(METODOS_PAGO[p.metodo] || p.metodo)}</td>
                        <td class="strong">${esc(money(p.monto))}</td>
                        <td class="right">${ctx.esAdmin ? `<button class="btn btn--ghost btn--sm" data-borrar-pago="${p.id}" title="Eliminar pago">${icon('trash')}</button>` : ''}</td>
                    </tr>`).join('')}
                </tbody></table></div>` : '<p class="empty">Sin pagos registrados.</p>'}
                ${puede && saldo > 0.01 ? `<button class="btn btn--gold btn--block" style="margin-top:.6rem" data-pago-detalle>${icon('plus')} Registrar pago</button>` : ''}

                <h3 style="margin:1.4rem 0 .6rem">Notificaciones</h3>
                ${notificaciones?.length ? `<ul class="list">${notificaciones.map(n => `<li>
                    <span class="list__body">
                        <strong>${esc(n.tipo)} · ${esc(n.canal)}</strong>
                        <small>${esc(fechaHora(n.created_at))} · ${esc(n.destinatario || 'sin destinatario')}</small>
                    </span>
                    <span class="list__side">${tag(n.estado)}</span>
                </li>`).join('')}</ul>` : '<p class="empty">Aún no se han enviado mensajes de esta reservación.</p>'}
            </div>
        </div>`,
        footer: `
            <button type="button" class="btn btn--ghost" data-cerrar>Cerrar</button>
            ${ctx.esStaff && r.estado === 'pendiente' ? `<button type="button" class="btn btn--gold" data-confirmar>Confirmar reservación</button>` : ''}
            ${ctx.esStaff && r.estado === 'confirmada' ? `<button type="button" class="btn btn--ghost" data-completar>Marcar completada</button>` : ''}
            ${ctx.esStaff && ['pendiente', 'confirmada'].includes(r.estado) ? `<button type="button" class="btn btn--danger" data-cancelar>Cancelar reservación</button>` : ''}
            ${ctx.esStaff ? `<button type="button" class="btn btn--primary" data-editar>Editar</button>` : ''}
        `
    });

    const foot = qs('#modal-foot');
    const bodyEl = qs('#modal-body');

    qs('[data-cerrar]', foot).addEventListener('click', modal.close);
    qs('[data-editar]', foot)?.addEventListener('click', () => { modal.close(); abrirFormulario(ctx, r); });
    qs('[data-confirmar]', foot)?.addEventListener('click', () => { modal.close(); cambiarEstado(ctx, r.id, 'confirmada'); });
    qs('[data-completar]', foot)?.addEventListener('click', () => { modal.close(); cambiarEstado(ctx, r.id, 'completada'); });
    qs('[data-cancelar]', foot)?.addEventListener('click', () => { modal.close(); cancelarReserva(ctx, r.id); });
    qs('[data-pago-detalle]', bodyEl)?.addEventListener('click', () => { modal.close(); abrirPago(ctx, r.id); });

    qsa('[data-borrar-pago]', bodyEl).forEach(btn => btn.addEventListener('click', () => {
        confirmar({
            title: 'Eliminar pago',
            message: 'El pago se eliminará del historial y el saldo se recalculará. Esta acción queda en la bitácora.',
            confirmText: 'Eliminar',
            danger: true,
            onConfirm: async () => {
                try {
                    await eliminar('pagos', { id: btn.dataset.borrarPago });
                    toast('Pago eliminado.', 'ok');
                    modal.close();
                    await refrescar(ctx);
                    abrirDetalle(ctx, id);
                } catch (error) { toast(error.message, 'error'); }
            }
        });
    }));

    qsa('[data-notif]', bodyEl).forEach(btn => btn.addEventListener('click', () => {
        enviarNotificacion(ctx, r, btn.dataset.notif, 'confirmada');
    }));

    qsa('[data-cerrar-detalle]', bodyEl).forEach(a => a.addEventListener('click', () => modal.close()));
}

/* ============================================================
   Acciones de estado
   ============================================================ */
async function cambiarEstado(ctx, id, nuevoEstado) {
    const r = cache.filas.find(x => x.id === id);
    if (!r) return;

    if (nuevoEstado === 'confirmada') {
        try {
            const libre = await rpc('verificar_disponibilidad', {
                p_cabana_id: r.cabana_id,
                p_desde: r.fecha_entrada,
                p_hasta: r.fecha_salida,
                p_excluir_reserva: r.id
            });
            if (!libre) return toast('La cabaña ya tiene otra reservación en esas fechas.', 'error');
        } catch (error) {
            return toast(error.message, 'error');
        }
    }

    try {
        await actualizar('reservaciones', {
            estado: nuevoEstado,
            updated_by: ctx.session?.user?.id || null
        }, { id });
        toast(`Reservación ${r.codigo} marcada como ${estadoTexto(nuevoEstado).toLowerCase()}.`, 'ok');
        await refrescar(ctx);
    } catch (error) {
        toast(error.message, 'error');
    }
}

function cancelarReserva(ctx, id) {
    const r = cache.filas.find(x => x.id === id);
    if (!r) return;
    confirmar({
        title: `Cancelar ${r.codigo}`,
        message: 'La cabaña quedará disponible para esas fechas. El registro se conserva en el historial y en la bitácora.',
        confirmText: 'Cancelar reservación',
        danger: true,
        onConfirm: async () => {
            try {
                await actualizar('reservaciones', {
                    estado: 'cancelada',
                    updated_by: ctx.session?.user?.id || null
                }, { id });
                toast('Reservación cancelada. La disponibilidad ya está liberada.', 'ok');
                await refrescar(ctx);
            } catch (error) { toast(error.message, 'error'); }
        }
    });
}

/* ============================================================
   Pagos
   ============================================================ */
function abrirPago(ctx, id) {
    const r = cache.filas.find(x => x.id === id);
    if (!r) return;
    const saldo = Math.max(0, num(r.saldo));

    modal.open({
        title: `Registrar pago · ${r.codigo}`,
        narrow: true,
        body: `
        <form id="form-pago" class="form">
            <div class="detail-banner" style="margin:0">
                <span><span class="muted small">Total</span><br><strong>${esc(money(r.total))}</strong></span>
                <span><span class="muted small">Saldo</span><br><strong>${esc(money(saldo))}</strong></span>
                <span><span class="muted small">Huésped</span><br><strong>${esc(r.huesped_nombre)}</strong></span>
            </div>
            <label class="field"><span>Monto recibido (L) *</span><input name="monto" type="number" min="0.01" step="0.01" max="${saldo}" value="${saldo.toFixed(2)}" required></label>
            <label class="field"><span>Método de pago *</span>
                <select name="metodo" required>
                    ${Object.entries(METODOS_PAGO).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}
                </select>
            </label>
            <label class="field"><span>Fecha del pago *</span><input name="fecha_pago" type="date" value="${hoyISO()}" required></label>
            <label class="field"><span>Referencia / comprobante</span><input name="referencia" placeholder="N.º de transferencia, recibo, etc."></label>
            <label class="field"><span>Notas</span><textarea name="notas" placeholder="Detalle opcional"></textarea></label>
            <p class="form__error" id="error-pago" hidden></p>
        </form>`,
        footer: `<button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button type="button" class="btn btn--primary" id="guardar-pago">Guardar pago</button>`
    });

    const form = qs('#form-pago');
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);

    qs('#guardar-pago', foot).addEventListener('click', async (e) => {
        if (!form.reportValidity()) return;
        const data = formData(form);
        const monto = num(data.monto);
        if (monto <= 0) return;
        if (monto > saldo + 0.01) {
            const err = qs('#error-pago');
            err.textContent = `El pago supera el saldo pendiente (${money(saldo)}).`;
            err.hidden = false;
            return;
        }
        e.currentTarget.disabled = true;
        try {
            await insertar('pagos', {
                reservacion_id: r.id,
                monto,
                metodo: data.metodo,
                fecha_pago: data.fecha_pago,
                referencia: data.referencia || null,
                notas: data.notas || null,
                created_by: ctx.session?.user?.id || null
            });
            toast(`Pago de ${money(monto)} registrado.`, 'ok');
            modal.close();
            await refrescar(ctx);
            abrirDetalle(ctx, r.id);
        } catch (error) {
            const err = qs('#error-pago');
            err.textContent = error.message;
            err.hidden = false;
            e.currentTarget.disabled = false;
        }
    });
}

/* ============================================================
   Notificaciones
   ============================================================ */
async function enviarNotificacion(ctx, r, canal, tipo) {
    const datos = {
        huesped: r.huesped_nombre,
        codigo: r.codigo,
        cabana: r.cabana_codigo,
        tipo: r.tipo_nombre,
        entrada: fechaMedia(r.fecha_entrada),
        salida: fechaMedia(r.fecha_salida),
        noches: r.noches,
        adultos: r.adultos,
        ninos: r.ninos,
        total: money(r.total),
        anticipo: money(r.pagado),
        saldo: money(r.saldo),
        negocio: ctx.nombreNegocio(),
        telefono: ctx.ajustes.negocio?.telefono || '',
        email: ctx.ajustes.negocio?.email || '',
        instrucciones_pago: ctx.ajustes.pago_instrucciones?.texto || '',
        monto: money(r.pagado),
    };
    const texto = renderPlantilla(ctx.plantilla(tipo) || 'Reservación {{codigo}} · {{entrada}} al {{salida}}.', datos);
    const asunto = `${ctx.nombreNegocio()} · Reservación ${r.codigo}`;

    if (canal === 'whatsapp') {
        if (!r.huesped_telefono) return toast('El huésped no tiene teléfono registrado.', 'error');
        abrirWhatsApp(r.huesped_telefono, texto);
    } else {
        if (!r.huesped_email) return toast('El huésped no tiene correo registrado.', 'error');
        abrirCorreo(r.huesped_email, asunto, texto);
    }

    try {
        await insertar('notificaciones', {
            reservacion_id: r.id,
            canal,
            tipo,
            destinatario: canal === 'whatsapp' ? r.huesped_telefono : r.huesped_email,
            asunto: canal === 'email' ? asunto : null,
            cuerpo: texto,
            estado: 'enviada',
            enviada_at: new Date().toISOString(),
            created_by: ctx.session?.user?.id || null
        });
        toast('Mensaje preparado y registrado en el historial.', 'ok');
    } catch {
        toast('El mensaje se abrió, pero no se pudo registrar en el historial.', 'error');
    }
}

/* ============================================================
   Utilidades
   ============================================================ */
async function refrescar(ctx) {
    await cargarTodo(ctx);
    const cont = qs('#contenido-admin');
    if (cont && location.hash.startsWith('#/reservaciones')) {
        cont.innerHTML = plantilla(ctx);
        pintar(ctx);
        qs('#f-texto')?.addEventListener('input', (e) => { filtros.texto = e.target.value.trim().toLowerCase(); pintar(ctx); });
        qs('#f-estado')?.addEventListener('change', (e) => { filtros.estado = e.target.value; pintar(ctx); });
        qs('#f-pago')?.addEventListener('change', (e) => { filtros.pago = e.target.value; pintar(ctx); });
        qs('#f-desde')?.addEventListener('change', (e) => { filtros.desde = e.target.value; pintar(ctx); });
        qs('#f-hasta')?.addEventListener('change', (e) => { filtros.hasta = e.target.value; pintar(ctx); });
        qs('#btn-limpiar')?.addEventListener('click', () => {
            filtros = { texto: '', estado: '', pago: '', desde: '', hasta: '' };
            qsa('.toolbar input, .toolbar select').forEach(x => { if (x.id !== 'f-texto') x.value = ''; });
            qs('#f-texto').value = '';
            pintar(ctx);
        });
        qs('#btn-nueva')?.addEventListener('click', () => abrirFormulario(ctx));
        qs('#btn-exportar')?.addEventListener('click', () => exportar(ctx));
        qs('#tabla-reservas')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-accion]');
            if (!btn) return;
            const id = btn.dataset.id;
            if (btn.dataset.accion === 'ver') abrirDetalle(ctx, id);
            if (btn.dataset.accion === 'editar' && ctx.esStaff) abrirFormulario(ctx, cache.filas.find(r => r.id === id));
            if (btn.dataset.accion === 'confirmar' && ctx.esStaff) cambiarEstado(ctx, id, 'confirmada');
            if (btn.dataset.accion === 'cancelar' && ctx.esStaff) cancelarReserva(ctx, id);
            if (btn.dataset.accion === 'pago' && ctx.esStaff) abrirPago(ctx, id);
        });
    }
}

function exportar(ctx) {
    const filas = filasFiltradas();
    descargarCSV(`reservaciones-${hoyISO()}.csv`, filas, [
        { label: 'Código', key: 'codigo' },
        { label: 'Huésped', key: 'huesped_nombre' },
        { label: 'Teléfono', key: 'huesped_telefono' },
        { label: 'Correo', key: 'huesped_email' },
        { label: 'Cabaña', key: 'cabana_codigo' },
        { label: 'Tipo', key: 'tipo_nombre' },
        { label: 'Entrada', key: 'fecha_entrada' },
        { label: 'Salida', key: 'fecha_salida' },
        { label: 'Noches', key: 'noches' },
        { label: 'Adultos', key: 'adultos' },
        { label: 'Niños', key: 'ninos' },
        { label: 'Tarifa', key: 'tarifa_noche' },
        { label: 'Total', key: 'total' },
        { label: 'Pagado', key: 'pagado' },
        { label: 'Saldo', key: 'saldo' },
        { label: 'Estado', value: r => estadoTexto(r.estado) },
        { label: 'Estado de pago', value: r => estadoTexto(r.estado_pago) },
    ]);
}
