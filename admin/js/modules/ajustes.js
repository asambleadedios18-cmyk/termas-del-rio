/* Módulo · Ajustes, usuarios, plantillas y bitácora */
import { seleccionar, actualizar, guardarAjuste, rpc } from '../db.js';
import {
    esc, num, qs, qsa, modal, toast, confirmar, formData, fechaHora,
    hoyISO, estadoTexto, tag, money
} from '../util.js';
import { icon } from '../icons.js';

export const meta = {
    id: 'ajustes',
    title: 'Ajustes y seguridad',
    eyebrow: 'Administración',
    icon: icon('settings'),
    roles: ['admin'],
};

let cache = { perfiles: [], actividad: [], notificaciones: [] };
let tab = 'negocio';

const PLANTILLAS = [
    ['solicitud_recibida', 'Solicitud recibida'],
    ['confirmada', 'Reservación confirmada'],
    ['pago_recibido', 'Pago recibido'],
    ['recordatorio', 'Recordatorio de llegada'],
    ['modificada', 'Reservación modificada'],
    ['cancelada', 'Reservación cancelada'],
    ['rechazada', 'Solicitud rechazada'],
];

const CAMPOS = '{{huesped}}, {{codigo}}, {{cabana}}, {{tipo}}, {{entrada}}, {{salida}}, {{noches}}, {{adultos}}, {{ninos}}, {{total}}, {{anticipo}}, {{saldo}}, {{monto}}, {{negocio}}, {{telefono}}, {{email}}, {{instrucciones_pago}}';

export async function render(el, ctx) {
    tab = 'negocio';
    await cargar();
    el.innerHTML = plantilla(ctx);
    pintar(ctx);
    bind(ctx);
}

async function cargar() {
    const [perfiles, actividad, notificaciones] = await Promise.all([
        seleccionar('perfiles', { order: { col: 'created_at', asc: true } }).catch(() => []),
        seleccionar('actividad', { order: { col: 'created_at', asc: false }, limit: 250 }).catch(() => []),
        seleccionar('notificaciones', { order: { col: 'created_at', asc: false }, limit: 100 }).catch(() => []),
    ]);
    cache = { perfiles: perfiles || [], actividad: actividad || [], notificaciones: notificaciones || [] };
}

function plantilla(ctx) {
    return `
    <div class="page-head">
        <div class="page-head__text">
            <p class="eyebrow">Administración</p>
            <h2>Ajustes y seguridad</h2>
            <p>Datos del negocio, plantillas de mensajes, usuarios, bitácora y respaldo.</p>
        </div>
        <div class="page-head__actions">
            <button class="btn btn--ghost" id="a-respaldo">${icon('download')} Copia de datos (JSON)</button>
        </div>
    </div>

    <div class="tabs" id="tabs-ajustes">
        <button data-tab="negocio" class="${tab === 'negocio' ? 'is-active' : ''}">Negocio y pagos</button>
        <button data-tab="plantillas" class="${tab === 'plantillas' ? 'is-active' : ''}">Plantillas</button>
        <button data-tab="usuarios" class="${tab === 'usuarios' ? 'is-active' : ''}">Usuarios y roles</button>
        <button data-tab="bitacora" class="${tab === 'bitacora' ? 'is-active' : ''}">Bitácora</button>
        <button data-tab="respaldo" class="${tab === 'respaldo' ? 'is-active' : ''}">Respaldo y seguridad</button>
    </div>
    <div id="panel-ajustes"></div>`;
}

function bind(ctx) {
    qsa('#tabs-ajustes button').forEach(btn => btn.addEventListener('click', () => {
        tab = btn.dataset.tab;
        qsa('#tabs-ajustes button').forEach(b => b.classList.toggle('is-active', b === btn));
        pintar(ctx);
    }));
    qs('#a-respaldo')?.addEventListener('click', () => respaldo(ctx));
    qs('#panel-ajustes')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'guardar-usuario') guardarUsuario(ctx, btn.dataset.id);
        if (btn.dataset.accion === 'detalle-actividad') verActividad(btn.dataset.id);
    });
}

function pintar(ctx) {
    const panel = qs('#panel-ajustes');
    if (!panel) return;
    if (tab === 'negocio') { panel.innerHTML = vistaNegocio(ctx); bindNegocio(ctx); }
    else if (tab === 'plantillas') { panel.innerHTML = vistaPlantillas(ctx); bindPlantillas(ctx); }
    else if (tab === 'usuarios') panel.innerHTML = vistaUsuarios(ctx);
    else if (tab === 'bitacora') panel.innerHTML = vistaBitacora();
    else { panel.innerHTML = vistaRespaldo(); qs('#b-descargar')?.addEventListener('click', () => respaldo(ctx)); }
}

/* ============================================================
   Negocio y pagos
   ============================================================ */
function vistaNegocio(ctx) {
    const n = ctx.ajustes.negocio || {};
    const r = ctx.ajustes.reservas || {};
    const pago = ctx.ajustes.pago_instrucciones || {};
    return `<div class="grid grid--2">
        <section class="card">
            <div class="card__head"><div><h3>Datos del negocio</h3><p>Se usan en mensajes, comprobantes y el sitio público.</p></div></div>
            <div class="card__body">
                <form id="form-negocio" class="form">
                    <div class="form-grid">
                        <label class="field"><span>Nombre comercial</span><input name="nombre" value="${esc(n.nombre || '')}"></label>
                        <label class="field"><span>Sitio web</span><input name="sitio" value="${esc(n.sitio || '')}"></label>
                        <label class="field"><span>Teléfono</span><input name="telefono" value="${esc(n.telefono || '')}"></label>
                        <label class="field"><span>WhatsApp (solo dígitos)</span><input name="whatsapp" value="${esc(n.whatsapp || '')}"></label>
                        <label class="field span-2"><span>Correo de reservaciones</span><input name="email" type="email" value="${esc(n.email || '')}"></label>
                        <label class="field span-2"><span>Dirección</span><input name="direccion" value="${esc(n.direccion || '')}"></label>
                        <label class="field"><span>Check-in</span><input name="check_in" value="${esc(n.check_in || '')}" placeholder="Ej. 2:00 p.m."></label>
                        <label class="field"><span>Check-out</span><input name="check_out" value="${esc(n.check_out || '')}" placeholder="Ej. 12:00 m.d."></label>
                    </div>
                    <div class="form-actions"><button type="submit" class="btn btn--primary">Guardar datos</button></div>
                </form>
            </div>
        </section>

        <div>
            <section class="card" style="margin-bottom:1rem">
                <div class="card__head"><div><h3>Reglas de reservación</h3><p>Controlan el formulario público y los cálculos.</p></div></div>
                <div class="card__body">
                    <form id="form-reglas" class="form">
                        <div class="form-grid">
                            <label class="field"><span>Máximo de noches por solicitud</span><input name="max_noches" type="number" min="1" max="365" value="${num(r.max_noches) || 30}"></label>
                            <label class="field"><span>Anticipo sugerido (%)</span><input name="anticipo_sugerido_pct" type="number" min="0" max="100" value="${num(r.anticipo_sugerido_pct)}"></label>
                            <label class="field"><span>Mostrar tarifas en el sitio</span><select name="mostrar_tarifas">
                                <option value="true" ${r.mostrar_tarifas !== false ? 'selected' : ''}>Sí</option>
                                <option value="false" ${r.mostrar_tarifas === false ? 'selected' : ''}>No</option>
                            </select></label>
                            <label class="field"><span>Permitir reservaciones pendientes</span><select name="permitir_pendientes">
                                <option value="true" ${r.permitir_pendientes !== false ? 'selected' : ''}>Sí</option>
                                <option value="false" ${r.permitir_pendientes === false ? 'selected' : ''}>No</option>
                            </select></label>
                        </div>
                        <div class="form-actions"><button type="submit" class="btn btn--primary">Guardar reglas</button></div>
                    </form>
                </div>
            </section>

            <section class="card">
                <div class="card__head"><div><h3>Instrucciones de pago</h3><p>Se incluyen en el mensaje de confirmación. No inventes datos bancarios.</p></div></div>
                <div class="card__body">
                    <form id="form-pago" class="form">
                        <label class="field"><span>Texto para el huésped</span>
                            <textarea name="texto" style="min-height:130px" placeholder="Ej. Transferencia a nombre de… / pago en recepción">${esc(pago.texto || '')}</textarea>
                        </label>
                        <div class="form-actions"><button type="submit" class="btn btn--primary">Guardar instrucciones</button></div>
                    </form>
                </div>
            </section>
        </div>
    </div>`;
}

function bindNegocio(ctx) {
    qs('#form-negocio').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formData(e.currentTarget);
        try {
            await guardarAjuste('negocio', {
                ...(ctx.ajustes.negocio || {}),
                ...data,
                moneda: ctx.ajustes.negocio?.moneda || 'HNL',
                simbolo: ctx.ajustes.negocio?.simbolo || 'L',
                zona_horaria: ctx.ajustes.negocio?.zona_horaria || 'America/Tegucigalpa'
            }, ctx.session?.user?.id);
            await ctx.recargarAjustes();
            toast('Datos del negocio guardados.', 'ok');
        } catch (error) { toast(error.message, 'error'); }
    });

    qs('#form-reglas').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formData(e.currentTarget);
        try {
            await guardarAjuste('reservas', {
                max_noches: num(data.max_noches),
                anticipo_sugerido_pct: num(data.anticipo_sugerido_pct),
                mostrar_tarifas: data.mostrar_tarifas === 'true',
                permitir_pendientes: data.permitir_pendientes === 'true'
            }, ctx.session?.user?.id);
            await ctx.recargarAjustes();
            toast('Reglas guardadas.', 'ok');
        } catch (error) { toast(error.message, 'error'); }
    });

    qs('#form-pago').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formData(e.currentTarget);
        try {
            await guardarAjuste('pago_instrucciones', { texto: data.texto || '' }, ctx.session?.user?.id);
            await ctx.recargarAjustes();
            toast('Instrucciones guardadas.', 'ok');
        } catch (error) { toast(error.message, 'error'); }
    });
}

/* ============================================================
   Plantillas
   ============================================================ */
function vistaPlantillas(ctx) {
    const plantillas = ctx.ajustes.plantillas || {};
    return `<div class="grid grid--2">
        <section class="card">
            <div class="card__head"><div><h3>Mensajes al huésped</h3><p>Se abren en WhatsApp o correo desde cada reservación.</p></div></div>
            <div class="card__body">
                <p class="small muted" style="margin-bottom:.7rem">Variables disponibles: <code>${esc(CAMPOS)}</code></p>
                <form id="form-plantillas" class="form">
                    ${PLANTILLAS.map(([key, label]) => `<label class="field"><span>${esc(label)}</span>
                        <textarea name="${key}" style="min-height:110px">${esc(plantillas[key] || '')}</textarea>
                    </label>`).join('')}
                    <div class="form-actions"><button type="submit" class="btn btn--primary">Guardar plantillas</button></div>
                </form>
            </div>
        </section>
        <section class="card">
            <div class="card__head"><div><h3>Historial de notificaciones</h3><p>Mensajes preparados o enviados desde el panel.</p></div></div>
            <div class="card__body">
                ${cache.notificaciones.length ? `<div class="table-wrap"><table class="data data--cards">
                    <thead><tr><th>Fecha</th><th>Canal</th><th>Tipo</th><th>Destinatario</th><th>Estado</th></tr></thead>
                    <tbody>${cache.notificaciones.map(n => `<tr>
                        <td data-label="Fecha">${esc(fechaHora(n.created_at))}</td>
                        <td data-label="Canal">${esc(n.canal)}</td>
                        <td data-label="Tipo">${esc(n.tipo)}</td>
                        <td data-label="Destinatario"><span class="small">${esc(n.destinatario || '—')}</span></td>
                        <td data-label="Estado">${tag(n.estado)}</td>
                    </tr>`).join('')}</tbody>
                </table></div>` : '<p class="empty">Aún no se han registrado notificaciones.</p>'}
                <p class="small muted" style="margin-top:.8rem">El envío automático requiere configurar un proveedor de correo o la API de WhatsApp Business. Mientras tanto, el mensaje se abre en WhatsApp/correo y queda registrado aquí.</p>
            </div>
        </section>
    </div>`;
}

function bindPlantillas(ctx) {
    qs('#form-plantillas').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formData(e.currentTarget);
        try {
            await guardarAjuste('plantillas', data, ctx.session?.user?.id);
            await ctx.recargarAjustes();
            toast('Plantillas guardadas.', 'ok');
        } catch (error) { toast(error.message, 'error'); }
    });
}

/* ============================================================
   Usuarios
   ============================================================ */
function vistaUsuarios(ctx) {
    const miId = ctx.session?.user?.id;
    return `<section class="card">
        <div class="card__head">
            <div><h3>Usuarios del panel</h3><p>Los usuarios se crean en Supabase Auth. Aquí se asigna el rol y se activa el acceso.</p></div>
        </div>
        <div class="card__body">
            <div class="table-wrap">
                <table class="data data--cards">
                    <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Activo</th><th>Alta</th><th class="right">Acciones</th></tr></thead>
                    <tbody>
                    ${cache.perfiles.length ? cache.perfiles.map(p => {
                        const esYo = p.id === miId;
                        return `<tr>
                            <td data-label="Nombre"><span class="strong">${esc(p.nombre)}</span>${esYo ? '<span class="sub">Tu cuenta</span>' : ''}</td>
                            <td data-label="Correo"><span class="small">${esc(p.email || '—')}</span></td>
                            <td data-label="Rol">
                                <select id="rol-${p.id}" ${esYo ? 'disabled' : ''} style="padding:.32rem;border:1px solid var(--linea);border-radius:7px;font-size:.75rem">
                                    ${['admin', 'recepcion', 'consulta'].map(r => `<option value="${r}" ${p.rol === r ? 'selected' : ''}>${r === 'admin' ? 'Administrador' : r === 'recepcion' ? 'Recepción' : 'Consulta'}</option>`).join('')}
                                </select>
                            </td>
                            <td data-label="Activo">
                                <select id="activo-${p.id}" ${esYo ? 'disabled' : ''} style="padding:.32rem;border:1px solid var(--linea);border-radius:7px;font-size:.75rem">
                                    <option value="true" ${p.activo ? 'selected' : ''}>Sí</option>
                                    <option value="false" ${!p.activo ? 'selected' : ''}>No</option>
                                </select>
                            </td>
                            <td data-label="Alta"><span class="small">${esc((p.created_at || '').slice(0, 10))}</span></td>
                            <td data-label="Acciones"><div class="actions">
                                ${esYo ? '<span class="small muted">No editable</span>' : `<button class="btn btn--ghost btn--sm" data-accion="guardar-usuario" data-id="${p.id}">Guardar</button>`}
                            </div></td>
                        </tr>`;
                    }).join('') : '<tr class="empty-row"><td colspan="6">No hay perfiles visibles.</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div class="detail-banner" style="margin-top:1rem">
                <span class="small muted">Para crear un usuario nuevo: <strong>Supabase → Authentication → Users → Add user</strong>. El perfil se crea automáticamente inactivo; actívalo aquí y asigna su rol. Nunca compartas la clave <code>service_role</code>.</span>
            </div>
        </div>
    </section>`;
}

async function guardarUsuario(ctx, id) {
    const rol = qs(`#rol-${id}`).value;
    const activo = qs(`#activo-${id}`).value === 'true';
    try {
        await actualizar('perfiles', { rol, activo }, { id });
        toast('Usuario actualizado.', 'ok');
        await recargar(ctx);
    } catch (error) { toast(error.message, 'error'); }
}

/* ============================================================
   Bitácora
   ============================================================ */
function vistaBitacora() {
    return `<section class="card">
        <div class="card__head"><div><h3>Registro de actividad</h3><p>Últimos 250 movimientos. Los detalles muestran los cambios realizados.</p></div></div>
        <div class="card__body">
            <div class="table-wrap">
                <table class="data data--cards">
                    <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
                    <tbody>
                    ${cache.actividad.length ? cache.actividad.map(a => `<tr>
                        <td data-label="Fecha"><span class="small">${esc(fechaHora(a.created_at))}</span></td>
                        <td data-label="Usuario"><span class="small">${esc(a.usuario_email || 'Sistema')}</span></td>
                        <td data-label="Acción"><span class="tag tag--neutral">${esc(a.accion)}</span></td>
                        <td data-label="Entidad">${esc(a.entidad || '—')}<span class="sub">${esc((a.entidad_id || '').slice(0, 12))}</span></td>
                        <td data-label="Detalle"><button class="btn btn--ghost btn--sm" data-accion="detalle-actividad" data-id="${a.id}">Ver</button></td>
                    </tr>`).join('') : '<tr class="empty-row"><td colspan="5">Sin movimientos registrados.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </section>`;
}

function verActividad(id) {
    const a = cache.actividad.find(x => String(x.id) === String(id));
    if (!a) return;
    modal.open({
        title: `${a.accion} · ${a.entidad || ''}`,
        wide: true,
        body: `<dl class="kv" style="margin-bottom:.8rem">
            <dt>Fecha</dt><dd>${esc(fechaHora(a.created_at))}</dd>
            <dt>Usuario</dt><dd>${esc(a.usuario_email || 'Sistema')}</dd>
            <dt>Entidad</dt><dd>${esc(a.entidad || '—')} ${esc(a.entidad_id || '')}</dd>
        </dl>
        <pre style="background:#0f3130;color:#dcefec;padding:1rem;border-radius:10px;overflow:auto;font-size:.7rem;max-height:50vh">${esc(JSON.stringify(a.detalle || {}, null, 2))}</pre>`,
        footer: '<button class="btn btn--ghost" data-cerrar>Cerrar</button>'
    });
    qs('#modal-foot [data-cerrar]').addEventListener('click', modal.close);
}

/* ============================================================
   Respaldo y seguridad
   ============================================================ */
function vistaRespaldo() {
    return `<div class="grid grid--2">
        <section class="card">
            <div class="card__head"><div><h3>Respaldo de datos</h3><p>Descarga un archivo JSON con la información operativa.</p></div></div>
            <div class="card__body">
                <p class="small" style="color:var(--tinta-2)">Incluye cabañas, tipos, tarifas, huéspedes, reservaciones, pagos, solicitudes y ajustes. No incluye contraseñas ni claves de acceso. Guárdalo en un lugar seguro: contiene datos personales de huéspedes.</p>
                <button class="btn btn--primary" id="b-descargar">${icon('download')} Descargar copia ahora</button>
                <hr style="border:0;border-top:1px solid var(--linea-2);margin:1rem 0">
                <p class="small muted" style="margin:0">Para respaldos automáticos, programa <code>pg_dump</code> o usa los respaldos administrados de Supabase. Este panel no sustituye esa copia.</p>
            </div>
        </section>

        <section class="card">
            <div class="card__head"><div><h3>Controles de seguridad activos</h3><p>Verificados en la base de datos, no solo en la interfaz.</p></div></div>
            <div class="card__body">
                <ul class="list">
                    ${[
                        ['Fila por fila (RLS)', 'Todas las tablas tienen políticas por rol.'],
                        ['Solicitudes públicas aisladas', 'El visitante solo puede crear solicitudes y leer tipos de cabaña.'],
                        ['Anti-traslape en base de datos', 'Restricción de exclusión por cabaña y rango de fechas.'],
                        ['Códigos únicos', 'Generados por secuencia y protegidos contra cambios.'],
                        ['Bitácora de cambios', 'Altas, modificaciones y bajas quedan registradas.'],
                        ['Sesión con Supabase Auth', 'Contraseñas gestionadas por el proveedor; nunca se almacenan en el panel.'],
                    ].map(([t, d]) => `<li><span class="list__body"><strong>${esc(t)}</strong><small>${esc(d)}</small></span><span class="tag tag--disponible">Activo</span></li>`).join('')}
                </ul>
            </div>
        </section>

        <section class="card" style="grid-column:1/-1">
            <div class="card__head"><div><h3>Recomendaciones operativas</h3><p>Buenas prácticas para proteger la información de los huéspedes.</p></div></div>
            <div class="card__body">
                <div class="grid grid--3">
                    ${[
                        ['Cuentas individuales', 'Cada persona debe tener su propio usuario. No compartas contraseñas.'],
                        ['Rol mínimo', 'Usa “consulta” o “recepción” salvo que se necesite administración total.'],
                        ['Revisión de accesos', 'Desactiva de inmediato a quien deje de laborar en el establecimiento.'],
                        ['Datos mínimos', 'Solicita solo la identidad y el contacto necesarios para la reservación.'],
                        ['Respaldos periódicos', 'Descarga una copia antes de cambios masivos de tarifas o inventario.'],
                        ['Enlaces privados', 'No publiques el enlace del panel ni compartas capturas con datos de huéspedes.'],
                    ].map(([t, d]) => `<div style="padding:.8rem;border:1px solid var(--linea);border-radius:10px;background:#fcfaf5">
                        <strong style="display:block;font-size:.82rem;color:var(--bosque);margin-bottom:.2rem">${esc(t)}</strong>
                        <small class="muted">${esc(d)}</small>
                    </div>`).join('')}
                </div>
            </div>
        </section>
    </div>`;
}

async function respaldo(ctx) {
    const tablas = ['tipos_cabana', 'cabanas', 'tarifas', 'huespedes', 'solicitudes', 'reservaciones', 'pagos', 'ajustes', 'notificaciones'];
    toast('Preparando copia de datos…', 'info', 2500);
    try {
        const datos = { generado: new Date().toISOString(), negocio: ctx.nombreNegocio(), tablas: {} };
        for (const tabla of tablas) {
            datos.tablas[tabla] = await seleccionar(tabla, { limit: 5000 });
        }
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo-termas-${hoyISO()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast('Copia descargada. Guárdala en un lugar seguro.', 'ok');
        await rpc('registrar_actividad', {
            p_accion: 'respaldo',
            p_entidad: 'sistema',
            p_detalle: { formato: 'json', tablas }
        }).catch(() => {});
    } catch (error) {
        toast(`No se pudo generar la copia: ${error.message}`, 'error');
    }
}

async function recargar(ctx) {
    await cargar();
    const cont = qs('#contenido-admin');
    if (cont && location.hash.startsWith('#/ajustes')) {
        cont.innerHTML = plantilla(ctx);
        pintar(ctx);
        bind(ctx);
    }
}
