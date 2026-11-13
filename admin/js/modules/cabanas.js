/* Módulo · Cabañas, tipos y tarifas */
import { rpc, seleccionar, insertar, actualizar, eliminar } from '../db.js';
import {
    esc, num, tag, estadoTexto, money, qs, qsa, modal, toast, confirmar,
    formData, hoyISO, fechaCorta, fechaMedia, descargarCSV
} from '../util.js';
import { icon } from '../icons.js';

export const meta = {
    id: 'cabanas',
    title: 'Cabañas y tarifas',
    eyebrow: 'Hospedaje',
    icon: icon('bed'),
    roles: ['admin', 'recepcion', 'consulta'],
};

let cache = { tipos: [], cabanas: [], tarifas: [], reservas: [] };
let tab = 'cabanas';
let rolActual = 'consulta';

export async function render(el, ctx) {
    rolActual = ctx.perfil?.rol || 'consulta';
    await cargar();
    el.innerHTML = plantilla(ctx);
    pintar();
    bind(ctx);
}

async function cargar() {
    const [tipos, cabanas, tarifas, reservas] = await Promise.all([
        seleccionar('tipos_cabana', { order: { col: 'orden', asc: true } }),
        seleccionar('cabanas', { order: { col: 'codigo', asc: true } }),
        seleccionar('tarifas', { order: [{ col: 'tipo_id', asc: true }, { col: 'vigente_desde', asc: false }] }),
        seleccionar('reservaciones', {
            select: 'id,cabana_id,estado,fecha_entrada,fecha_salida',
            in: { estado: ['pendiente', 'confirmada'] },
            gte: { fecha_salida: hoyISO() },
            limit: 500
        }),
    ]);
    cache = { tipos: tipos || [], cabanas: cabanas || [], tarifas: tarifas || [], reservas: reservas || [] };
}

function plantilla(ctx) {
    return `
    <div class="page-head">
        <div class="page-head__text">
            <p class="eyebrow">Hospedaje</p>
            <h2>Cabañas y tarifas</h2>
            <p>Inventario editable, capacidad por tipo y precios por noche sin tocar código.</p>
        </div>
        <div class="page-head__actions">
            <button class="btn btn--ghost" id="c-exportar">${icon('download')} Exportar inventario</button>
            ${ctx.esAdmin ? `<button class="btn btn--primary" id="c-nuevo-tipo">${icon('plus')} Nuevo tipo</button>` : ''}
        </div>
    </div>

    <div class="tabs" id="tabs-cabanas">
        <button data-tab="cabanas" class="${tab === 'cabanas' ? 'is-active' : ''}">Inventario (${cache.cabanas.filter(c => c.activo).length})</button>
        <button data-tab="tipos" class="${tab === 'tipos' ? 'is-active' : ''}">Tipos de cabaña (${cache.tipos.length})</button>
        <button data-tab="tarifas" class="${tab === 'tarifas' ? 'is-active' : ''}">Tarifas</button>
    </div>

    <div id="panel-cabanas"></div>`;
}

function bind(ctx) {
    qsa('#tabs-cabanas button').forEach(btn => btn.addEventListener('click', () => {
        tab = btn.dataset.tab;
        qsa('#tabs-cabanas button').forEach(b => b.classList.toggle('is-active', b === btn));
        pintar();
    }));
    qs('#c-exportar')?.addEventListener('click', exportar);
    qs('#c-nuevo-tipo')?.addEventListener('click', () => formTipo(ctx));
    qs('#panel-cabanas')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        const accion = btn.dataset.accion;
        if (accion === 'editar-cabana') formCabana(ctx, cache.cabanas.find(c => c.id === btn.dataset.id));
        if (accion === 'estado-cabana') cambiarEstado(ctx, cache.cabanas.find(c => c.id === btn.dataset.id));
        if (accion === 'editar-tipo') formTipo(ctx, cache.tipos.find(t => t.id === btn.dataset.id));
        if (accion === 'tarifa') formTarifa(ctx, null, btn.dataset.id);
        if (accion === 'editar-tarifa') formTarifa(ctx, cache.tarifas.find(t => t.id === btn.dataset.id));
        if (accion === 'borrar-tarifa') borrarTarifa(ctx, cache.tarifas.find(t => t.id === btn.dataset.id));
        if (accion === 'nueva-cabana') formCabana(ctx, null, btn.dataset.id);
    });
}

function pintar() {
    const panel = qs('#panel-cabanas');
    if (!panel) return;
    if (tab === 'cabanas') panel.innerHTML = vistaCabanas();
    else if (tab === 'tipos') panel.innerHTML = vistaTipos();
    else panel.innerHTML = vistaTarifas();
}

function reservasDe(cabanaId) {
    return cache.reservas.filter(r => r.cabana_id === cabanaId);
}

function vistaCabanas() {
    const grupos = [...new Map(cache.cabanas.map(c => [c.tipo_id, cache.tipos.find(t => t.id === c.tipo_id)])).values()].filter(Boolean);
    return `
    <section class="card" style="margin-bottom:1rem">
        <div class="card__head">
            <div><h3>Inventario físico</h3><p>Cada código representa una cabaña real. El estado fuera de servicio bloquea nuevas reservaciones.</p></div>
        </div>
        <div class="card__body">
            ${grupos.map(tipo => {
                const cabanas = cache.cabanas.filter(c => c.tipo_id === tipo.id);
                return `<h4 style="margin:1rem 0 .5rem;font-family:var(--sans);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--gris)">
                    ${esc(tipo.nombre)} · ${cabanas.length} cabaña(s)
                </h4>
                <div class="table-wrap">
                    <table class="data data--cards">
                        <thead><tr><th>Código</th><th>Estado</th><th>Próximas reservas</th><th>Notas</th><th class="right">Acciones</th></tr></thead>
                        <tbody>${cabanas.map(c => {
                            const proximas = reservasDe(c.id);
                            return `<tr>
                                <td data-label="Código"><span class="strong">${esc(c.codigo)}</span><span class="sub">${esc(tipo.nombre)}</span></td>
                                <td data-label="Estado">${tag(c.estado)}${c.activo ? '' : '<span class="sub">Inactiva</span>'}</td>
                                <td data-label="Próximas reservas">${proximas.length}${proximas[0] ? `<span class="sub">${esc(fechaCorta(proximas[0].fecha_entrada))} → ${esc(fechaCorta(proximas[0].fecha_salida))}</span>` : '<span class="sub">Sin reservas futuras</span>'}</td>
                                <td data-label="Notas"><span class="small muted">${esc(c.notas || '—')}</span></td>
                                <td data-label="Acciones"><div class="actions">
                                    <button class="btn btn--ghost btn--sm" data-accion="estado-cabana" data-id="${c.id}">Estado</button>
                                    ${rolActual === 'admin' ? `<button class="btn btn--ghost btn--sm" data-accion="editar-cabana" data-id="${c.id}">${icon('edit')}</button>` : ''}
                                </div></td>
                            </tr>`;
                        }).join('')}</tbody>
                    </table>
                </div>`;
            }).join('')}
            ${rolActual === 'admin' ? `<button class="btn btn--ghost" style="margin-top:1rem" data-accion="nueva-cabana">${icon('plus')} Agregar cabaña</button>` : ''}
        </div>
    </section>`;
}

function vistaTipos() {
    const admin = rolActual === 'admin';
    return `
    <div class="cabin-grid">
        ${cache.tipos.map(t => {
            const cabanas = cache.cabanas.filter(c => c.tipo_id === t.id && c.activo);
            const precio = precioVigente(t.id);
            return `<article class="cabin-card">
                <div class="cabin-card__media">
                    <img src="../img/cabanas/cabanas-interior.jpg" alt="Interior de cabaña en Termas del Río" loading="lazy">
                    <span class="cabin-card__badge">${t.activo ? '<span class="tag tag--disponible">Activo</span>' : '<span class="tag tag--neutral">Inactivo</span>'}</span>
                </div>
                <div class="cabin-card__body">
                    <h3>${esc(t.nombre)}</h3>
                    <p>${num(t.capacidad_max)} personas · ${esc(t.camas || '')} · ${cabanas.length} cabaña(s)</p>
                    <div class="cabin-card__foot">
                        <span class="small">${precio ? `<strong>${esc(money(precio))}</strong> / noche` : '<span class="muted">Sin tarifa</span>'}</span>
                        ${admin ? `<button class="btn btn--ghost btn--sm" data-accion="editar-tipo" data-id="${t.id}">Editar</button>` : ''}
                    </div>
                    <details style="margin-top:.6rem"><summary class="small" style="cursor:pointer;color:var(--verde-600)">Descripción pública</summary>
                        <p class="small" style="white-space:pre-wrap;margin:.5rem 0 0;color:var(--tinta-2)">${esc(t.descripcion || 'Sin descripción.')}</p>
                    </details>
                </div>
            </article>`;
        }).join('')}
    </div>
    ${cache.tipos.length ? '' : '<p class="empty">No hay tipos de cabaña configurados.</p>'}`;
}

function precioVigente(tipoId) {
    const hoy = hoyISO();
    const t = cache.tarifas
        .filter(x => x.tipo_id === tipoId && x.activo && x.vigente_desde <= hoy && (!x.vigente_hasta || x.vigente_hasta >= hoy))
        .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
    return t ? num(t.precio_noche) : 0;
}

function vistaTarifas() {
    const admin = rolActual === 'admin';
    return `
    <section class="card">
        <div class="card__head">
            <div><h3>Tarifas por noche</h3><p>Los precios no vienen precargados: el administrador define cada tarifa y su vigencia. Se aplican automáticamente al crear reservaciones.</p></div>
            <div class="card__tools">${admin ? `<button class="btn btn--primary btn--sm" data-accion="tarifa">${icon('plus')} Nueva tarifa</button>` : ''}</div>
        </div>
        <div class="card__body">
            <div class="table-wrap">
                <table class="data data--cards">
                    <thead><tr><th>Tipo</th><th>Tarifa</th><th>Precio por noche</th><th>Vigencia</th><th>Estado</th><th class="right">Acciones</th></tr></thead>
                    <tbody>
                    ${cache.tarifas.length ? cache.tarifas.map(t => {
                        const tipo = cache.tipos.find(x => x.id === t.tipo_id);
                        const vigente = t.activo && t.vigente_desde <= hoyISO() && (!t.vigente_hasta || t.vigente_hasta >= hoyISO());
                        return `<tr>
                            <td data-label="Tipo"><span class="strong">${esc(tipo?.nombre || 'Tipo eliminado')}</span><span class="sub">${esc(t.moneda)}</span></td>
                            <td data-label="Tarifa">${esc(t.nombre)}</td>
                            <td data-label="Precio por noche"><span class="strong">${esc(money(t.precio_noche))}</span></td>
                            <td data-label="Vigencia">${esc(fechaMedia(t.vigente_desde))}${t.vigente_hasta ? ` → ${esc(fechaMedia(t.vigente_hasta))}` : ' → sin fin'}</td>
                            <td data-label="Estado">${vigente ? '<span class="tag tag--disponible">Vigente</span>' : t.activo ? '<span class="tag tag--neutral">Programada / vencida</span>' : '<span class="tag tag--neutral">Inactiva</span>'}</td>
                            <td data-label="Acciones"><div class="actions">
                                ${admin ? `<button class="btn btn--ghost btn--sm" data-accion="editar-tarifa" data-id="${t.id}">${icon('edit')}</button>
                                <button class="btn btn--ghost btn--sm" data-accion="borrar-tarifa" data-id="${t.id}">${icon('trash')}</button>` : ''}
                            </div></td>
                        </tr>`;
                    }).join('') : '<tr class="empty-row"><td colspan="6">Aún no hay tarifas. Crea la primera para poder calcular totales.</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div class="detail-banner" style="margin-top:1rem">
                ${cache.tipos.map(t => `<span><span class="muted small">${esc(t.nombre)}</span><br><strong>${precioVigente(t.id) ? esc(money(precioVigente(t.id))) : 'Sin tarifa'}</strong></span>`).join('')}
            </div>
        </div>
    </section>`;
}

/* ============================================================
   Formularios
   ============================================================ */
function formCabana(ctx, cabana = null, tipoId = '') {
    const editando = Boolean(cabana);
    const tipos = cache.tipos;
    modal.open({
        title: editando ? `Editar cabaña ${cabana.codigo}` : 'Nueva cabaña',
        narrow: true,
        body: `<form id="form-cabana" class="form">
            <div class="form-grid">
                <label class="field"><span>Código *</span><input name="codigo" required value="${esc(cabana?.codigo || '')}" placeholder="D-11"></label>
                <label class="field"><span>Tipo *</span><select name="tipo_id" required>
                    ${tipos.map(t => `<option value="${t.id}" ${(cabana?.tipo_id || tipoId) === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
                </select></label>
                <label class="field"><span>Estado</span><select name="estado">
                    ${['disponible', 'mantenimiento', 'fuera_servicio'].map(e => `<option value="${e}" ${cabana?.estado === e ? 'selected' : ''}>${esc(estadoTexto(e))}</option>`).join('')}
                </select></label>
                <label class="field"><span>Activa</span><select name="activo">
                    <option value="true" ${cabana?.activo !== false ? 'selected' : ''}>Sí</option>
                    <option value="false" ${cabana?.activo === false ? 'selected' : ''}>No</option>
                </select></label>
            </div>
            <label class="field"><span>Notas internas</span><textarea name="notas" placeholder="Ubicación, detalles de mantenimiento, etc.">${esc(cabana?.notas || '')}</textarea></label>
            <p class="form__error" id="error-cabana" hidden></p>
        </form>`,
        footer: `<button class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button class="btn btn--primary" id="guardar-cabana">Guardar</button>`
    });
    const form = qs('#form-cabana');
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);
    qs('#guardar-cabana', foot).addEventListener('click', async (e) => {
        if (!form.reportValidity()) return;
        const data = formData(form);
        e.currentTarget.disabled = true;
        try {
            const valores = {
                codigo: data.codigo,
                tipo_id: data.tipo_id,
                estado: data.estado,
                activo: data.activo === 'true',
                notas: data.notas || null
            };
            if (editando) await actualizar('cabanas', valores, { id: cabana.id });
            else await insertar('cabanas', valores);
            toast(editando ? 'Cabaña actualizada.' : 'Cabaña agregada.', 'ok');
            modal.close();
            await recargar(ctx);
        } catch (error) {
            const el = qs('#error-cabana');
            el.textContent = error.message;
            el.hidden = false;
            e.currentTarget.disabled = false;
        }
    });
}

function formTipo(ctx, tipo = null) {
    const editando = Boolean(tipo);
    modal.open({
        title: editando ? 'Editar tipo de cabaña' : 'Nuevo tipo de cabaña',
        wide: true,
        body: `<form id="form-tipo" class="form">
            <div class="form-grid form-grid--3">
                <label class="field span-2"><span>Nombre *</span><input name="nombre" required value="${esc(tipo?.nombre || '')}" placeholder="Cabaña Doble – 2 camas"></label>
                <label class="field"><span>Identificador (slug)</span><input name="slug" value="${esc(tipo?.slug || '')}" placeholder="doble"></label>
                <label class="field"><span>Capacidad máxima *</span><input name="capacidad_max" type="number" min="1" step="1" required value="${num(tipo?.capacidad_max) || 2}"></label>
                <label class="field"><span>Camas</span><input name="camas" value="${esc(tipo?.camas || '')}" placeholder="2 camas Queen"></label>
                <label class="field"><span>Orden</span><input name="orden" type="number" step="1" value="${num(tipo?.orden) || 0}"></label>
                <label class="field span-2"><span>Amenidades (separadas por coma)</span><input name="amenidades" value="${esc((tipo?.amenidades || []).join(', '))}" placeholder="2 camas Queen, Acceso a piscinas"></label>
                <label class="field"><span>Activo</span><select name="activo">
                    <option value="true" ${tipo?.activo !== false ? 'selected' : ''}>Sí</option>
                    <option value="false" ${tipo?.activo === false ? 'selected' : ''}>No</option>
                </select></label>
            </div>
            <label class="field"><span>Descripción pública</span><textarea name="descripcion" style="min-height:190px">${esc(tipo?.descripcion || '')}</textarea></label>
            <p class="form__error" id="error-tipo" hidden></p>
        </form>`,
        footer: `${editando && ctx.esAdmin ? `<button class="btn btn--danger" id="borrar-tipo">Eliminar</button><span style="flex:1"></span>` : ''}
                 <button class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button class="btn btn--primary" id="guardar-tipo">Guardar</button>`
    });
    const form = qs('#form-tipo');
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);
    qs('#guardar-tipo', foot).addEventListener('click', async (e) => {
        if (!form.reportValidity()) return;
        const data = formData(form);
        e.currentTarget.disabled = true;
        try {
            const valores = {
                nombre: data.nombre,
                slug: data.slug || slugify(data.nombre),
                capacidad_max: num(data.capacidad_max),
                camas: data.camas || null,
                descripcion: data.descripcion || null,
                amenidades: (data.amenidades || '').split(',').map(s => s.trim()).filter(Boolean),
                activo: data.activo === 'true',
                orden: num(data.orden)
            };
            if (editando) await actualizar('tipos_cabana', valores, { id: tipo.id });
            else await insertar('tipos_cabana', valores);
            toast(editando ? 'Tipo actualizado.' : 'Tipo creado.', 'ok');
            modal.close();
            await recargar(ctx);
        } catch (error) {
            const el = qs('#error-tipo');
            el.textContent = error.message;
            el.hidden = false;
            e.currentTarget.disabled = false;
        }
    });
    qs('#borrar-tipo', foot)?.addEventListener('click', () => {
        modal.close();
        confirmar({
            title: 'Eliminar tipo de cabaña',
            message: 'Solo se puede eliminar si no tiene cabañas ni tarifas asociadas.',
            confirmText: 'Eliminar',
            danger: true,
            onConfirm: async () => {
                try {
                    await eliminar('tipos_cabana', { id: tipo.id });
                    toast('Tipo eliminado.', 'ok');
                    await recargar(ctx);
                } catch (error) { toast(error.message, 'error'); }
            }
        });
    });
}

function formTarifa(ctx, tarifa = null, tipoId = '') {
    const editando = Boolean(tarifa);
    modal.open({
        title: editando ? 'Editar tarifa' : 'Nueva tarifa',
        narrow: true,
        body: `<form id="form-tarifa" class="form">
            <label class="field"><span>Tipo de cabaña *</span><select name="tipo_id" required>
                ${cache.tipos.map(t => `<option value="${t.id}" ${(tarifa?.tipo_id || tipoId) === t.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
            </select></label>
            <label class="field"><span>Nombre de la tarifa *</span><input name="nombre" required value="${esc(tarifa?.nombre || 'Tarifa general')}"></label>
            <div class="form-grid">
                <label class="field"><span>Precio por noche (L) *</span><input name="precio_noche" type="number" min="0" step="0.01" required value="${tarifa ? num(tarifa.precio_noche) : ''}"></label>
                <label class="field"><span>Moneda</span><input name="moneda" value="${esc(tarifa?.moneda || 'HNL')}" maxlength="3"></label>
                <label class="field"><span>Vigente desde *</span><input name="vigente_desde" type="date" required value="${esc(tarifa?.vigente_desde || hoyISO())}"></label>
                <label class="field"><span>Vigente hasta</span><input name="vigente_hasta" type="date" value="${esc(tarifa?.vigente_hasta || '')}"></label>
            </div>
            <label class="field"><span>Activa</span><select name="activo">
                <option value="true" ${tarifa?.activo !== false ? 'selected' : ''}>Sí</option>
                <option value="false" ${tarifa?.activo === false ? 'selected' : ''}>No</option>
            </select></label>
            <p class="small muted" style="margin:0">Los cambios de precio no modifican reservaciones ya creadas; cada reservación conserva la tarifa con la que se registró.</p>
            <p class="form__error" id="error-tarifa" hidden></p>
        </form>`,
        footer: `<button class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button class="btn btn--primary" id="guardar-tarifa">Guardar tarifa</button>`
    });
    const form = qs('#form-tarifa');
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);
    qs('#guardar-tarifa', foot).addEventListener('click', async (e) => {
        if (!form.reportValidity()) return;
        const data = formData(form);
        e.currentTarget.disabled = true;
        try {
            const valores = {
                tipo_id: data.tipo_id,
                nombre: data.nombre,
                precio_noche: num(data.precio_noche),
                moneda: data.moneda || 'HNL',
                vigente_desde: data.vigente_desde,
                vigente_hasta: data.vigente_hasta || null,
                activo: data.activo === 'true'
            };
            if (editando) await actualizar('tarifas', valores, { id: tarifa.id });
            else await insertar('tarifas', valores);
            toast(editando ? 'Tarifa actualizada.' : 'Tarifa creada.', 'ok');
            modal.close();
            await recargar(ctx);
        } catch (error) {
            const el = qs('#error-tarifa');
            el.textContent = error.message;
            el.hidden = false;
            e.currentTarget.disabled = false;
        }
    });
}

/* ============================================================
   Estado de cabaña
   ============================================================ */
async function cambiarEstado(ctx, cabana) {
    modal.open({
        title: `Estado · ${cabana.codigo}`,
        narrow: true,
        body: `<form id="form-estado" class="form">
            <label class="field"><span>Estado de la cabaña</span>
                <select name="estado">
                    ${['disponible', 'mantenimiento', 'fuera_servicio'].map(e => `<option value="${e}" ${cabana.estado === e ? 'selected' : ''}>${esc(estadoTexto(e))}</option>`).join('')}
                </select>
            </label>
            <label class="field"><span>Notas</span><textarea name="notas" placeholder="Motivo del cambio">${esc(cabana.notas || '')}</textarea></label>
            <p class="small muted" style="margin:0">Poner una cabaña fuera de servicio no cancela reservaciones existentes.</p>
            <p class="form__error" id="error-estado" hidden></p>
        </form>`,
        footer: `<button class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button class="btn btn--primary" id="aplicar-estado">Aplicar</button>`
    });
    const form = qs('#form-estado');
    const foot = qs('#modal-foot');
    qs('[data-cerrar]', foot).addEventListener('click', modal.close);

    const aplicar = async (forzar = false) => {
        const data = formData(form);
        try {
            await rpc('cambiar_estado_cabana', {
                p_cabana_id: cabana.id,
                p_estado: data.estado,
                p_notas: data.notas || null,
                p_forzar: forzar
            });
            toast('Estado actualizado.', 'ok');
            modal.close();
            await recargar(ctx);
        } catch (error) {
            if (!forzar && /reservaci/i.test(error.message) && data.estado !== 'disponible') {
                const el = qs('#error-estado');
                el.innerHTML = `${esc(error.message)}
                    <button type="button" class="btn btn--danger btn--sm" id="forzar-estado" style="margin-top:.5rem">Aplicar de todos modos</button>`;
                el.hidden = false;
                qs('#forzar-estado')?.addEventListener('click', () => aplicar(true));
            } else {
                const el = qs('#error-estado');
                el.textContent = error.message;
                el.hidden = false;
            }
        }
    };

    qs('#aplicar-estado', foot).addEventListener('click', () => aplicar(false));
}

function borrarTarifa(ctx, tarifa) {
    if (!tarifa) return;
    confirmar({
        title: 'Eliminar tarifa',
        message: `${money(tarifa.precio_noche)} por noche. Las reservaciones existentes conservan su precio.`,
        confirmText: 'Eliminar',
        danger: true,
        onConfirm: async () => {
            try {
                await eliminar('tarifas', { id: tarifa.id });
                toast('Tarifa eliminada.', 'ok');
                await recargar(ctx);
            } catch (error) { toast(error.message, 'error'); }
        }
    });
}

/* ============================================================
   Recarga
   ============================================================ */
async function recargar(ctx) {
    await cargar();
    const cont = qs('#contenido-admin');
    if (cont && location.hash.startsWith('#/cabanas')) {
        cont.innerHTML = plantilla(ctx);
        pintar();
        bind(ctx);
    }
}

function slugify(texto) {
    return String(texto)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function exportar() {
    descargarCSV(`inventario-cabanas-${hoyISO()}.csv`, cache.cabanas, [
        { label: 'Código', key: 'codigo' },
        { label: 'Tipo', value: c => cache.tipos.find(t => t.id === c.tipo_id)?.nombre || '' },
        { label: 'Estado', value: c => estadoTexto(c.estado) },
        { label: 'Activa', value: c => c.activo ? 'Sí' : 'No' },
        { label: 'Capacidad', value: c => cache.tipos.find(t => t.id === c.tipo_id)?.capacidad_max || '' },
        { label: 'Notas', key: 'notas' },
    ]);
}

