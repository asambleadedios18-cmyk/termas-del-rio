/* Módulo · Huéspedes */
import { seleccionar, insertar, actualizar, eliminar } from '../db.js';
import {
    esc, num, tag, fechaCorta, fechaMedia, money, qs, qsa, modal, toast, confirmar,
    formData, descargarCSV, hoyISO, estadoTexto, fechaHora
} from '../util.js';
import { icon } from '../icons.js';

export const meta = {
    id: 'huespedes',
    title: 'Huéspedes',
    eyebrow: 'Hospedaje',
    icon: icon('users'),
    roles: ['admin', 'recepcion', 'consulta'],
};

let cache = { filas: [], reservas: [] };
let filtro = '';

export async function render(el, ctx, params) {
    filtro = (params?.get('buscar') || '').toLowerCase();
    await cargar();
    el.innerHTML = plantilla(ctx);
    pintar(ctx);
    bind(ctx);
}

async function cargar() {
    const [filas, reservas] = await Promise.all([
        seleccionar('huespedes', { order: { col: 'nombre_completo', asc: true }, limit: 800 }),
        seleccionar('v_reservaciones_detalle', {
            select: 'id,codigo,huesped_id,huesped_nombre,fecha_entrada,fecha_salida,estado,total,pagado,saldo,cabana_codigo,tipo_nombre,created_at',
            order: { col: 'fecha_entrada', asc: false }, limit: 800
        }),
    ]);
    cache = { filas: filas || [], reservas: reservas || [] };
}

function plantilla(ctx) {
    return `
    <div class="page-head">
        <div class="page-head__text">
            <p class="eyebrow">Hospedaje</p>
            <h2>Huéspedes</h2>
            <p>${cache.filas.length} fichas registradas · historial de reservaciones y observaciones.</p>
        </div>
        <div class="page-head__actions">
            <button class="btn btn--ghost" id="h-exportar">${icon('download')} Exportar CSV</button>
            ${ctx.esStaff ? `<button class="btn btn--primary" id="h-nuevo">${icon('plus')} Nuevo huésped</button>` : ''}
        </div>
    </div>

    <section class="card">
        <div class="toolbar">
            <label class="field field--grow"><span>Buscar huésped</span>
                <input id="h-buscar" type="search" placeholder="Nombre, teléfono, correo o identidad" value="${esc(filtro)}">
            </label>
        </div>
        <div class="table-wrap">
            <table class="data data--cards" id="tabla-huespedes">
                <thead><tr>
                    <th>Huésped</th><th>Contacto</th><th>País</th><th>Reservaciones</th>
                    <th>Última estancia</th><th class="right">Acciones</th>
                </tr></thead>
                <tbody id="tbody-huespedes"></tbody>
            </table>
        </div>
    </section>`;
}

function pintar(ctx) {
    const tbody = qs('#tbody-huespedes');
    if (!tbody) return;
    const filas = cache.filas.filter(h => {
        if (!filtro) return true;
        return [h.nombre_completo, h.telefono, h.email, h.identidad, h.pais].join(' ').toLowerCase().includes(filtro);
    });

    if (!filas.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No hay huéspedes que coincidan con la búsqueda.</td></tr>`;
        return;
    }

    tbody.innerHTML = filas.map(h => {
        const reservas = cache.reservas.filter(r => r.huesped_id === h.id);
        const ultima = reservas[0];
        return `<tr>
            <td data-label="Huésped"><span class="strong">${esc(h.nombre_completo)}</span><span class="sub">${esc(h.identidad || 'Sin identidad registrada')}</span></td>
            <td data-label="Contacto"><span class="strong">${esc(h.telefono)}</span><span class="sub">${esc(h.email || 'Sin correo')}</span></td>
            <td data-label="País">${esc(h.pais || '—')}</td>
            <td data-label="Reservaciones">${reservas.length}<span class="sub">${reservas.filter(r => r.estado === 'confirmada').length} confirmadas</span></td>
            <td data-label="Última estancia">${ultima ? `${esc(fechaCorta(ultima.fecha_entrada))}<span class="sub">${esc(ultima.cabana_codigo || '')}</span>` : '<span class="muted">—</span>'}</td>
            <td data-label="Acciones"><div class="actions">
                <button class="btn btn--ghost btn--sm" data-accion="ver" data-id="${h.id}">${icon('eye')}</button>
                ${ctx.esStaff ? `<button class="btn btn--ghost btn--sm" data-accion="editar" data-id="${h.id}">${icon('edit')}</button>` : ''}
            </div></td>
        </tr>`;
    }).join('');
}

function bind(ctx) {
    qs('#h-buscar')?.addEventListener('input', (e) => { filtro = e.target.value.trim().toLowerCase(); pintar(ctx); });
    qs('#h-nuevo')?.addEventListener('click', () => formulario(ctx));
    qs('#h-exportar')?.addEventListener('click', exportar);
    qs('#tabla-huespedes')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const h = cache.filas.find(x => x.id === btn.dataset.id);
        if (!h) return;
        if (btn.dataset.accion === 'ver') detalle(ctx, h);
        if (btn.dataset.accion === 'editar' && ctx.esStaff) formulario(ctx, h);
    });
}

function formulario(ctx, huesped = null) {
    const editando = Boolean(huesped);
    const { body } = modal.open({
        title: editando ? 'Editar huésped' : 'Nuevo huésped',
        body: `
        <form id="form-huesped" class="form">
            <div class="form-grid">
                <label class="field span-2"><span>Nombre completo *</span><input name="nombre_completo" required value="${esc(huesped?.nombre_completo || '')}"></label>
                <label class="field"><span>Teléfono / WhatsApp *</span><input name="telefono" required value="${esc(huesped?.telefono || '')}" placeholder="+504 0000-0000"></label>
                <label class="field"><span>Correo electrónico</span><input name="email" type="email" value="${esc(huesped?.email || '')}"></label>
                <label class="field"><span>Identidad / pasaporte</span><input name="identidad" value="${esc(huesped?.identidad || '')}"></label>
                <label class="field"><span>País</span><input name="pais" value="${esc(huesped?.pais || 'Honduras')}"></label>
            </div>
            <label class="field"><span>Observaciones</span><textarea name="notas" placeholder="Preferencias, alergias, notas del equipo">${esc(huesped?.notas || '')}</textarea></label>
            <p class="form__error" id="error-huesped" hidden></p>
        </form>`,
        footer: `${editando && ctx.esAdmin ? `<button type="button" class="btn btn--danger" id="borrar-huesped">Eliminar</button>` : ''}
                 <span style="flex:1"></span>
                 <button type="button" class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button type="button" class="btn btn--primary" id="guardar-huesped">Guardar</button>`
    });

    const form = qs('#form-huesped', body);
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);

    qs('#guardar-huesped', foot).addEventListener('click', async (e) => {
        if (!form.reportValidity()) return;
        const data = formData(form);
        const errorEl = qs('#error-huesped', body);
        errorEl.hidden = true;
        e.currentTarget.disabled = true;
        try {
            const valores = {
                nombre_completo: data.nombre_completo,
                telefono: data.telefono,
                email: data.email || null,
                identidad: data.identidad || null,
                pais: data.pais || 'Honduras',
                notas: data.notas || null
            };
            if (editando) {
                await actualizar('huespedes', valores, { id: huesped.id });
                toast('Huésped actualizado.', 'ok');
            } else {
                await insertar('huespedes', { ...valores, created_by: ctx.session?.user?.id || null });
                toast('Huésped registrado.', 'ok');
            }
            modal.close();
            await recargar(ctx);
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.hidden = false;
            e.currentTarget.disabled = false;
        }
    });

    qs('#borrar-huesped', foot)?.addEventListener('click', () => {
        modal.close();
        confirmar({
            title: 'Eliminar huésped',
            message: 'Solo es posible si no tiene reservaciones asociadas. La acción queda registrada en la bitácora.',
            confirmText: 'Eliminar',
            danger: true,
            onConfirm: async () => {
                try {
                    await eliminar('huespedes', { id: huesped.id });
                    toast('Huésped eliminado.', 'ok');
                    await recargar(ctx);
                } catch (error) { toast(error.message, 'error'); }
            }
        });
    });
}

async function detalle(ctx, h) {
    const reservas = cache.reservas.filter(r => r.huesped_id === h.id);
    const totalGastado = reservas.filter(r => r.estado !== 'cancelada').reduce((s, r) => s + num(r.pagado), 0);

    modal.open({
        title: h.nombre_completo,
        wide: true,
        body: `
        <div class="grid grid--2">
            <div>
                <h3 style="margin-bottom:.6rem">Ficha</h3>
                <dl class="kv">
                    <dt>Teléfono</dt><dd>${esc(h.telefono)}</dd>
                    <dt>Correo</dt><dd>${esc(h.email || '—')}</dd>
                    <dt>Identidad</dt><dd>${esc(h.identidad || '—')}</dd>
                    <dt>País</dt><dd>${esc(h.pais || '—')}</dd>
                    <dt>Registrado</dt><dd>${esc(fechaHora(h.created_at))}</dd>
                    <dt>Observaciones</dt><dd>${esc(h.notas || '—')}</dd>
                </dl>
                <div class="detail-banner" style="margin-top:1rem">
                    <span><span class="muted small">Reservaciones</span><br><strong>${reservas.length}</strong></span>
                    <span><span class="muted small">Total pagado</span><br><strong>${esc(money(totalGastado))}</strong></span>
                </div>
            </div>
            <div>
                <h3 style="margin-bottom:.6rem">Historial</h3>
                ${reservas.length ? `<div class="table-wrap"><table class="data">
                    <thead><tr><th>Código</th><th>Fechas</th><th>Estado</th><th>Saldo</th></tr></thead>
                    <tbody>${reservas.map(r => `<tr>
                        <td class="strong">${esc(r.codigo)}<span class="sub">${esc(r.cabana_codigo || '')}</span></td>
                        <td>${esc(fechaCorta(r.fecha_entrada))} → ${esc(fechaCorta(r.fecha_salida))}</td>
                        <td>${tag(r.estado)}</td>
                        <td>${esc(money(r.saldo))}</td>
                    </tr>`).join('')}</tbody>
                </table></div>` : '<p class="empty">Sin reservaciones registradas.</p>'}
            </div>
        </div>`,
        footer: `<button class="btn btn--ghost" data-cerrar>Cerrar</button>
                 ${h.telefono ? `<button class="btn btn--ghost" data-wa>${icon('whatsapp')} WhatsApp</button>` : ''}
                 ${ctx.esStaff ? `<button class="btn btn--primary" data-editar>Editar ficha</button>` : ''}`
    });
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);
    qs('[data-editar]', foot)?.addEventListener('click', () => { modal.close(); formulario(ctx, h); });
    qs('[data-wa]', foot)?.addEventListener('click', () => {
        window.open(`https://wa.me/${String(h.telefono).replace(/\D/g, '')}`, '_blank', 'noopener');
    });
}

async function recargar(ctx) {
    await cargar();
    const cont = qs('#contenido-admin');
    if (cont && location.hash.startsWith('#/huespedes')) {
        cont.innerHTML = plantilla(ctx);
        pintar(ctx);
        bind(ctx);
    }
}

function exportar() {
    const filas = cache.filas.filter(h => !filtro ||
        [h.nombre_completo, h.telefono, h.email, h.identidad, h.pais].join(' ').toLowerCase().includes(filtro));
    descargarCSV(`huespedes-${hoyISO()}.csv`, filas, [
        { label: 'Nombre', key: 'nombre_completo' },
        { label: 'Identidad', key: 'identidad' },
        { label: 'Teléfono', key: 'telefono' },
        { label: 'Correo', key: 'email' },
        { label: 'País', key: 'pais' },
        { label: 'Observaciones', key: 'notas' },
        { label: 'Reservaciones', value: h => cache.reservas.filter(r => r.huesped_id === h.id).length },
    ]);
}
