/* Módulo · Pagos y control financiero */
import { seleccionar, insertar, eliminar } from '../db.js';
import {
    esc, num, money, moneyShort, tag, fechaMedia, hoyISO, qs, qsa, modal, toast,
    confirmar, formData, descargarCSV, METODOS_PAGO, estadoTexto, fechaHora, pct
} from '../util.js';
import { icon } from '../icons.js';

export const meta = {
    id: 'pagos',
    title: 'Pagos',
    eyebrow: 'Finanzas',
    icon: icon('card'),
    roles: ['admin', 'recepcion', 'consulta'],
};

let cache = { pagos: [], reservas: [] };
let tab = 'pagos';
let filtros = { desde: '', hasta: '', metodo: '', texto: '' };

export async function render(el, ctx, params) {
    tab = params?.get('estado') === 'parcial' ? 'cobrar' : 'pagos';
    filtros = { desde: '', hasta: '', metodo: '', texto: '' };
    await cargar();
    el.innerHTML = plantilla(ctx);
    pintar(ctx);
    bind(ctx);
}

async function cargar() {
    const [pagos, reservas] = await Promise.all([
        seleccionar('pagos', { order: [{ col: 'fecha_pago', asc: false }, { col: 'created_at', asc: false }], limit: 1000 }),
        seleccionar('v_reservaciones_detalle', {
            order: { col: 'fecha_entrada', asc: true },
            limit: 800
        }),
    ]);
    cache = { pagos: pagos || [], reservas: reservas || [] };
}

function resumen() {
    const pagadoMes = cache.pagos
        .filter(p => (p.fecha_pago || '').slice(0, 7) === hoyISO().slice(0, 7))
        .reduce((s, p) => s + num(p.monto), 0);
    const totalCobrado = cache.pagos.reduce((s, p) => s + num(p.monto), 0);
    const activas = cache.reservas.filter(r => ['pendiente', 'confirmada'].includes(r.estado));
    const porCobrar = activas.reduce((s, r) => s + Math.max(0, num(r.saldo)), 0);
    const facturado = activas.reduce((s, r) => s + num(r.total), 0);
    return { pagadoMes, totalCobrado, porCobrar, facturado, activas: activas.length };
}

function plantilla(ctx) {
    const r = resumen();
    return `
    <div class="page-head">
        <div class="page-head__text">
            <p class="eyebrow">Finanzas</p>
            <h2>Pagos y saldos</h2>
            <p>Control de anticipos, pagos recibidos y saldo pendiente de cada reservación.</p>
        </div>
        <div class="page-head__actions">
            <button class="btn btn--ghost" id="p-exportar">${icon('download')} Exportar CSV</button>
            ${ctx.esStaff ? `<button class="btn btn--primary" id="p-nuevo">${icon('plus')} Registrar pago</button>` : ''}
        </div>
    </div>

    <div class="grid grid--stats" style="margin-bottom:1rem">
        ${stat('Cobrado este mes', moneyShort(r.pagadoMes), 'Pagos con fecha del mes actual', icon('card'))}
        ${stat('Total histórico cobrado', moneyShort(r.totalCobrado), `${cache.pagos.length} pagos registrados`, icon('chart'))}
        ${stat('Saldo por cobrar', moneyShort(r.porCobrar), `${r.activas} reservaciones activas`, icon('alert'))}
        ${stat('Facturado activo', moneyShort(r.facturado), 'Total de reservaciones pendientes y confirmadas', icon('building'))}
    </div>

    <div class="tabs" id="tabs-pagos">
        <button data-tab="pagos" class="${tab === 'pagos' ? 'is-active' : ''}">Pagos registrados</button>
        <button data-tab="cobrar" class="${tab === 'cobrar' ? 'is-active' : ''}">Cuentas por cobrar</button>
    </div>

    <div id="panel-pagos"></div>`;
}

function stat(label, value, hint, ico) {
    return `<article class="stat"><span class="stat__icon">${ico}</span>
        <span class="stat__label">${esc(label)}</span>
        <span class="stat__value">${esc(value)}</span>
        <span class="stat__hint">${esc(hint)}</span>
    </article>`;
}

function bind(ctx) {
    qsa('#tabs-pagos button').forEach(btn => btn.addEventListener('click', () => {
        tab = btn.dataset.tab;
        qsa('#tabs-pagos button').forEach(b => b.classList.toggle('is-active', b === btn));
        pintar(ctx);
    }));
    qs('#p-nuevo')?.addEventListener('click', () => formPago(ctx));
    qs('#p-exportar')?.addEventListener('click', exportar);
    qs('#panel-pagos')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'pagar') {
            const r = cache.reservas.find(x => x.id === btn.dataset.id);
            if (r) formPago(ctx, r);
        }
        if (btn.dataset.accion === 'borrar' && ctx.esAdmin) borrarPago(ctx, btn.dataset.id);
        if (btn.dataset.accion === 'ver-reserva') {
            location.hash = `#/reservaciones?ver=${btn.dataset.id}`;
        }
    });
}

function pintar(ctx) {
    const panel = qs('#panel-pagos');
    if (!panel) return;
    if (tab === 'pagos') panel.innerHTML = vistaPagos(ctx);
    else panel.innerHTML = vistaCobrar(ctx);
    bindFiltros(ctx);
}

function bindFiltros(ctx) {
    qs('#p-texto')?.addEventListener('input', (e) => { filtros.texto = e.target.value.trim().toLowerCase(); pintar(ctx); });
    qs('#p-metodo')?.addEventListener('change', (e) => { filtros.metodo = e.target.value; pintar(ctx); });
    qs('#p-desde')?.addEventListener('change', (e) => { filtros.desde = e.target.value; pintar(ctx); });
    qs('#p-hasta')?.addEventListener('change', (e) => { filtros.hasta = e.target.value; pintar(ctx); });
}

function vistaPagos(ctx) {
    const filas = cache.pagos.filter(p => {
        const r = cache.reservas.find(x => x.id === p.reservacion_id);
        if (filtros.desde && p.fecha_pago < filtros.desde) return false;
        if (filtros.hasta && p.fecha_pago > filtros.hasta) return false;
        if (filtros.metodo && p.metodo !== filtros.metodo) return false;
        if (filtros.texto) {
            const blob = [r?.codigo, r?.huesped_nombre, p.referencia, p.notas].join(' ').toLowerCase();
            if (!blob.includes(filtros.texto)) return false;
        }
        return true;
    });
    const total = filas.reduce((s, p) => s + num(p.monto), 0);

    return `<section class="card">
        <div class="toolbar">
            <label class="field field--grow"><span>Buscar</span><input id="p-texto" type="search" placeholder="Código, huésped o referencia" value="${esc(filtros.texto)}"></label>
            <label class="field"><span>Método</span><select id="p-metodo">
                <option value="">Todos</option>
                ${Object.entries(METODOS_PAGO).map(([k, v]) => `<option value="${k}" ${filtros.metodo === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
            </select></label>
            <label class="field"><span>Desde</span><input id="p-desde" type="date" value="${esc(filtros.desde)}"></label>
            <label class="field"><span>Hasta</span><input id="p-hasta" type="date" value="${esc(filtros.hasta)}"></label>
            <span class="toolbar__spacer"></span>
            <span class="small muted">${filas.length} pagos · <strong>${esc(money(total))}</strong></span>
        </div>
        <div class="table-wrap">
            <table class="data data--cards">
                <thead><tr><th>Fecha</th><th>Reservación</th><th>Huésped</th><th>Método</th><th>Referencia</th><th>Monto</th><th class="right">Acciones</th></tr></thead>
                <tbody id="tbody-pagos">
                ${filas.length ? filas.map(p => {
                    const r = cache.reservas.find(x => x.id === p.reservacion_id);
                    return `<tr>
                        <td data-label="Fecha">${esc(fechaMedia(p.fecha_pago))}<span class="sub">${esc((p.created_at || '').slice(0, 10))}</span></td>
                        <td data-label="Reservación"><span class="strong">${esc(r?.codigo || '—')}</span><span class="sub">${esc(r?.cabana_codigo || '')} ${esc(r?.tipo_nombre || '')}</span></td>
                        <td data-label="Huésped">${esc(r?.huesped_nombre || '—')}<span class="sub">${esc(r?.huesped_telefono || '')}</span></td>
                        <td data-label="Método">${esc(METODOS_PAGO[p.metodo] || p.metodo)}</td>
                        <td data-label="Referencia"><span class="small">${esc(p.referencia || '—')}</span></td>
                        <td data-label="Monto"><span class="strong">${esc(money(p.monto))}</span></td>
                        <td data-label="Acciones"><div class="actions">
                            ${r ? `<button class="btn btn--ghost btn--sm" data-accion="ver-reserva" data-id="${r.id}" title="Ver reservación">${icon('eye')}</button>` : ''}
                            ${ctx.esAdmin ? `<button class="btn btn--ghost btn--sm" data-accion="borrar" data-id="${p.id}" title="Eliminar pago">${icon('trash')}</button>` : ''}
                        </div></td>
                    </tr>`;
                }).join('') : '<tr class="empty-row"><td colspan="7">No hay pagos con esos filtros.</td></tr>'}
                </tbody>
            </table>
        </div>
        <div style="padding:1rem 1.25rem">
            <div class="detail-banner" style="margin:0">
                <span><span class="muted small">Total filtrado</span><br><strong>${esc(money(total))}</strong></span>
                <span><span class="muted small">Cobrado en el mes</span><br><strong>${esc(money(resumen().pagadoMes))}</strong></span>
                <span><span class="muted small">Saldo activo por cobrar</span><br><strong style="color:var(--rojo)">${esc(money(resumen().porCobrar))}</strong></span>
            </div>
        </div>
    </section>`;
}

function vistaCobrar(ctx) {
    const filas = cache.reservas
        .filter(r => ['pendiente', 'confirmada'].includes(r.estado) && num(r.saldo) > 0.01)
        .sort((a, b) => a.fecha_entrada.localeCompare(b.fecha_entrada));

    return `<section class="card">
        <div class="card__head">
            <div><h3>Cuentas por cobrar</h3><p>Reservaciones activas con saldo pendiente, ordenadas por llegada.</p></div>
        </div>
        <div class="table-wrap">
            <table class="data data--cards">
                <thead><tr><th>Código</th><th>Huésped</th><th>Cabaña</th><th>Llegada</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th class="right">Acciones</th></tr></thead>
                <tbody>
                ${filas.length ? filas.map(r => `<tr>
                    <td data-label="Código"><span class="strong">${esc(r.codigo)}</span></td>
                    <td data-label="Huésped">${esc(r.huesped_nombre)}<span class="sub">${esc(r.huesped_telefono || '')}</span></td>
                    <td data-label="Cabaña">${esc(r.cabana_codigo)}<span class="sub">${esc(r.tipo_nombre)}</span></td>
                    <td data-label="Llegada">${esc(fechaMedia(r.fecha_entrada))}</td>
                    <td data-label="Total">${esc(money(r.total))}</td>
                    <td data-label="Pagado">${esc(money(r.pagado))}</td>
                    <td data-label="Saldo"><strong style="color:var(--rojo)">${esc(money(r.saldo))}</strong></td>
                    <td data-label="Estado">${tag(r.estado_pago)}<span class="sub">${tag(r.estado)}</span></td>
                    <td data-label="Acciones"><div class="actions">
                        ${ctx.esStaff ? `<button class="btn btn--gold btn--sm" data-accion="pagar" data-id="${r.id}">Registrar pago</button>` : ''}
                        <button class="btn btn--ghost btn--sm" data-accion="ver-reserva" data-id="${r.id}">${icon('eye')}</button>
                    </div></td>
                </tr>`).join('') : '<tr class="empty-row"><td colspan="9">No hay saldos pendientes. Todas las reservaciones activas están pagadas.</td></tr>'}
                </tbody>
            </table>
        </div>
        <div style="padding:1rem 1.25rem">
            <div class="progress progress--gold"><span style="width:${pct(
                cache.reservas.filter(r => ['pendiente', 'confirmada'].includes(r.estado)).reduce((s, r) => s + num(r.pagado), 0),
                Math.max(1, cache.reservas.filter(r => ['pendiente', 'confirmada'].includes(r.estado)).reduce((s, r) => s + num(r.total), 0))
            )}%"></span></div>
            <p class="small muted" style="margin:.5rem 0 0">Progreso de cobro sobre reservaciones activas.</p>
        </div>
    </section>`;
}

/* ============================================================
   Registrar pago
   ============================================================ */
function formPago(ctx, reserva = null) {
    const opciones = cache.reservas
        .filter(r => ['pendiente', 'confirmada'].includes(r.estado) && num(r.saldo) > 0.01)
        .sort((a, b) => a.fecha_entrada.localeCompare(b.fecha_entrada));

    if (!opciones.length) {
        return toast('No hay reservaciones con saldo pendiente.', 'info');
    }

    const seleccionada = reserva || opciones[0];
    modal.open({
        title: 'Registrar pago',
        body: `
        <form id="form-pago-general" class="form">
            <label class="field"><span>Reservación *</span>
                <select name="reservacion_id" id="pg-reserva" required>
                    ${opciones.map(r => `<option value="${r.id}" ${r.id === seleccionada.id ? 'selected' : ''}>${esc(r.codigo)} · ${esc(r.huesped_nombre)} · ${esc(r.cabana_codigo)} · saldo ${esc(money(r.saldo))}</option>`).join('')}
                </select>
            </label>
            <div class="detail-banner" id="pg-resumen" style="margin:0"></div>
            <div class="form-grid">
                <label class="field"><span>Monto recibido (L) *</span><input name="monto" id="pg-monto" type="number" min="0.01" step="0.01" required></label>
                <label class="field"><span>Método *</span><select name="metodo" required>
                    ${Object.entries(METODOS_PAGO).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}
                </select></label>
                <label class="field"><span>Fecha del pago *</span><input name="fecha_pago" type="date" value="${hoyISO()}" required></label>
                <label class="field"><span>Referencia / comprobante</span><input name="referencia" placeholder="N.º de transferencia o recibo"></label>
            </div>
            <label class="field"><span>Notas</span><textarea name="notas" placeholder="Detalle opcional"></textarea></label>
            <p class="form__error" id="pg-error" hidden></p>
        </form>`,
        footer: `<button class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button class="btn btn--primary" id="pg-guardar">Guardar pago</button>`
    });

    const form = qs('#form-pago-general');
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);

    const actualizarResumen = () => {
        const r = cache.reservas.find(x => x.id === form.reservacion_id.value);
        if (!r) return;
        const saldo = num(r.saldo);
        qs('#pg-resumen').innerHTML = `
            <span><span class="muted small">Huésped</span><br><strong>${esc(r.huesped_nombre)}</strong></span>
            <span><span class="muted small">Total</span><br><strong>${esc(money(r.total))}</strong></span>
            <span><span class="muted small">Pagado</span><br><strong>${esc(money(r.pagado))}</strong></span>
            <span><span class="muted small">Saldo</span><br><strong style="color:var(--rojo)">${esc(money(saldo))}</strong></span>`;
        form.monto.max = saldo.toFixed(2);
        form.monto.value = saldo.toFixed(2);
    };

    form.reservacion_id.addEventListener('change', actualizarResumen);
    actualizarResumen();

    qs('#pg-guardar', foot).addEventListener('click', async (e) => {
        if (!form.reportValidity()) return;
        const data = formData(form);
        const r = cache.reservas.find(x => x.id === data.reservacion_id);
        const errorEl = qs('#pg-error');
        errorEl.hidden = true;
        if (!r) return;
        const monto = num(data.monto);
        if (monto <= 0) {
            errorEl.textContent = 'El monto debe ser mayor que cero.';
            errorEl.hidden = false;
            return;
        }
        if (monto > num(r.saldo) + 0.01) {
            errorEl.textContent = `El pago supera el saldo pendiente (${money(r.saldo)}).`;
            errorEl.hidden = false;
            return;
        }
        e.currentTarget.disabled = true;
        try {
            await insertar('pagos', {
                reservacion_id: data.reservacion_id,
                monto,
                metodo: data.metodo,
                fecha_pago: data.fecha_pago,
                referencia: data.referencia || null,
                notas: data.notas || null,
                created_by: ctx.session?.user?.id || null
            });
            toast(`Pago de ${money(monto)} registrado en ${r.codigo}.`, 'ok');
            modal.close();
            await recargar(ctx);
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.hidden = false;
            e.currentTarget.disabled = false;
        }
    });
}

function borrarPago(ctx, id) {
    const p = cache.pagos.find(x => x.id === id);
    if (!p) return;
    confirmar({
        title: 'Eliminar pago',
        message: `${money(p.monto)} del ${fechaMedia(p.fecha_pago)}. El saldo de la reservación se recalculará y la acción quedará en la bitácora.`,
        confirmText: 'Eliminar pago',
        danger: true,
        onConfirm: async () => {
            try {
                await eliminar('pagos', { id });
                toast('Pago eliminado.', 'ok');
                await recargar(ctx);
            } catch (error) { toast(error.message, 'error'); }
        }
    });
}

async function recargar(ctx) {
    await cargar();
    const cont = qs('#contenido-admin');
    if (cont && location.hash.startsWith('#/pagos')) {
        cont.innerHTML = plantilla(ctx);
        pintar(ctx);
        bind(ctx);
    }
}

function exportar() {
    const filas = cache.pagos.filter(p => {
        const r = cache.reservas.find(x => x.id === p.reservacion_id);
        if (filtros.desde && p.fecha_pago < filtros.desde) return false;
        if (filtros.hasta && p.fecha_pago > filtros.hasta) return false;
        if (filtros.metodo && p.metodo !== filtros.metodo) return false;
        if (filtros.texto) {
            const blob = [r?.codigo, r?.huesped_nombre, p.referencia, p.notas].join(' ').toLowerCase();
            if (!blob.includes(filtros.texto)) return false;
        }
        return true;
    });
    descargarCSV(`pagos-${hoyISO()}.csv`, filas, [
        { label: 'Fecha', key: 'fecha_pago' },
        { label: 'Reservación', value: p => cache.reservas.find(r => r.id === p.reservacion_id)?.codigo || '' },
        { label: 'Huésped', value: p => cache.reservas.find(r => r.id === p.reservacion_id)?.huesped_nombre || '' },
        { label: 'Método', value: p => METODOS_PAGO[p.metodo] || p.metodo },
        { label: 'Referencia', key: 'referencia' },
        { label: 'Monto', key: 'monto' },
        { label: 'Notas', key: 'notas' },
    ]);
}
