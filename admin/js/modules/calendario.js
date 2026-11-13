/* Módulo · Calendario de disponibilidad */
import { rpc } from '../db.js';
import {
    esc, num, fechaCorta, fechaMedia, hoyISO, addDays, parseISO, toISO, diffDays,
    qs, qsa, modal, toast, tag, money, fechaLarga, estadoTexto, diaSemanaCorto
} from '../util.js';
import { icon } from '../icons.js';

export const meta = {
    id: 'calendario',
    title: 'Calendario',
    eyebrow: 'Operación',
    icon: icon('calendar'),
    roles: ['admin', 'recepcion', 'consulta'],
};

let estado = { vista: 'mes', fecha: hoyISO(), tipo: '' };

export async function render(el, ctx) {
    estado = { vista: 'mes', fecha: hoyISO(), tipo: '' };
    el.innerHTML = `
        <div class="page-head">
            <div class="page-head__text">
                <p class="eyebrow">Operación</p>
                <h2>Calendario de ocupación</h2>
                <p>Verde disponible · Rojo ocupada · Amarillo pendiente · Gris fuera de servicio</p>
            </div>
            <div class="page-head__actions">
                <div class="segmented" id="cal-vista">
                    <button data-vista="dia">Día</button>
                    <button data-vista="semana">Semana</button>
                    <button data-vista="mes" class="is-active">Mes</button>
                </div>
                <a class="btn btn--ghost" href="#/reservaciones">${icon('calendar')} Reservaciones</a>
            </div>
        </div>
        <section class="card">
            <div class="cal-toolbar">
                <button class="icon-btn" id="cal-prev" aria-label="Período anterior">${icon('left')}</button>
                <button class="btn btn--ghost btn--sm" id="cal-hoy">Hoy</button>
                <button class="icon-btn" id="cal-next" aria-label="Período siguiente">${icon('right')}</button>
                <strong class="cal-toolbar__period" id="cal-periodo">—</strong>
                <select id="cal-tipo" class="btn btn--ghost btn--sm" style="padding:.42rem .6rem" aria-label="Filtrar por tipo de cabaña">
                    <option value="">Todos los tipos</option>
                </select>
                <span class="toolbar__spacer"></span>
                <span id="cal-resumen" class="small muted"></span>
            </div>
            <div class="cal-legend">
                <span><i class="cal-dot cal-dot--free"></i> Disponible</span>
                <span><i class="cal-dot cal-dot--occ"></i> Ocupada</span>
                <span><i class="cal-dot cal-dot--pend"></i> Pendiente</span>
                <span><i class="cal-dot cal-dot--off"></i> Fuera de servicio</span>
            </div>
            <div class="cal-scroll" id="cal-scroll"></div>
        </section>`;

    await pintarCalendario(ctx);

    qsa('#cal-vista button').forEach(btn => btn.addEventListener('click', async () => {
        estado.vista = btn.dataset.vista;
        qsa('#cal-vista button').forEach(b => b.classList.toggle('is-active', b === btn));
        await pintarCalendario(ctx);
    }));
    qs('#cal-prev').addEventListener('click', async () => { mover(-1); await pintarCalendario(ctx); });
    qs('#cal-next').addEventListener('click', async () => { mover(1); await pintarCalendario(ctx); });
    qs('#cal-hoy').addEventListener('click', async () => { estado.fecha = hoyISO(); await pintarCalendario(ctx); });
    qs('#cal-tipo').addEventListener('change', async (e) => { estado.tipo = e.target.value; await pintarCalendario(ctx); });
}

function mover(dir) {
    const f = parseISO(estado.fecha);
    if (estado.vista === 'dia') f.setDate(f.getDate() + dir);
    else if (estado.vista === 'semana') f.setDate(f.getDate() + dir * 7);
    else f.setMonth(f.getMonth() + dir);
    estado.fecha = toISO(f);
}

function rango() {
    if (estado.vista === 'dia') return { desde: estado.fecha, hasta: estado.fecha };
    if (estado.vista === 'semana') {
        const f = parseISO(estado.fecha);
        const dia = f.getDay();
        const offset = dia === 0 ? -6 : 1 - dia;
        f.setDate(f.getDate() + offset);
        const desde = toISO(f);
        return { desde, hasta: addDays(desde, 6) };
    }
    const f = parseISO(estado.fecha);
    const primero = new Date(f.getFullYear(), f.getMonth(), 1);
    const ultimo = new Date(f.getFullYear(), f.getMonth() + 1, 0);
    return { desde: toISO(primero), hasta: toISO(ultimo) };
}

function tituloPeriodo({ desde, hasta }) {
    const a = parseISO(desde), b = parseISO(hasta);
    if (estado.vista === 'dia') return fechaLarga(desde);
    if (estado.vista === 'semana') {
        return `${fechaCorta(desde)} – ${fechaCorta(hasta)} ${b.getFullYear()}`;
    }
    return `${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][a.getMonth()]} ${a.getFullYear()}`;
}

async function pintarCalendario(ctx) {
    const cont = qs('#cal-scroll');
    if (!cont) return;
    const { desde, hasta } = rango();
    qs('#cal-periodo').textContent = tituloPeriodo({ desde, hasta });

    cont.innerHTML = '<p class="cal-empty">Cargando calendario…</p>';

    const data = await rpc('calendario_reservas', { p_desde: desde, p_hasta: hasta });
    const cabanas = (data.cabanas || []).filter(c => !estado.tipo || c.tipo_id === estado.tipo);
    const reservas = data.reservaciones || [];

    const selectTipo = qs('#cal-tipo');
    if (selectTipo.options.length <= 1) {
        const tipos = [...new Map(cabanas.map(c => [c.tipo_id, c.tipo])).entries()];
        selectTipo.insertAdjacentHTML('beforeend', tipos.map(([id, nombre]) =>
            `<option value="${id}">${esc(nombre)}</option>`).join(''));
        if (!tipos.length) {
            try {
                const t = await rpc('tipos_cabana_publicos');
                selectTipo.insertAdjacentHTML('beforeend', (t || []).map(x =>
                    `<option value="${x.id}">${esc(x.nombre)}</option>`).join(''));
            } catch { /* sin tipos */ }
        }
    }

    const dias = [];
    for (let d = desde; d <= hasta; d = addDays(d, 1)) dias.push(d);

    const hoy = hoyISO();
    let ocupadasHoy = 0;
    let pendientes = 0;

    const filas = cabanas.map(c => {
        const celdas = dias.map(dia => {
            if (c.estado && c.estado !== 'disponible') {
                return `<td class="cal-cell cal-off" title="${esc(c.codigo)} · ${esc(estadoTexto(c.estado))}"></td>`;
            }
            const r = reservas.find(x => x.cabana_id === c.id && x.fecha_entrada <= dia && x.fecha_salida > dia);
            if (!r) {
                if (dia === hoy) ocupadasHoy += 0;
                return `<td class="cal-cell cal-free"><button type="button" data-libre="${c.id}" data-dia="${dia}" data-codigo="${esc(c.codigo)}" title="${esc(c.codigo)} · ${esc(fechaMedia(dia))} · disponible">·</button></td>`;
            }
            const esOcupada = r.estado === 'confirmada';
            if (esOcupada && dia === hoy) ocupadasHoy++;
            if (!esOcupada && dia === hoy) pendientes++;
            const inicio = r.fecha_entrada === dia;
            const fin = r.fecha_salida === addDays(dia, 1);
            return `<td class="cal-cell ${esOcupada ? 'cal-occ' : 'cal-pend'} ${inicio ? 'cal-start' : ''} ${fin ? 'cal-end' : ''}">
                <button type="button" data-reserva="${r.id}" data-codigo="${esc(r.codigo)}" title="${esc(r.codigo)} · ${esc(r.huesped)} · ${esc(r.cabana)} · ${esc(fechaCorta(r.fecha_entrada))} al ${esc(fechaCorta(r.fecha_salida))}">${inicio ? esc((r.huesped || '').split(' ')[0]) : ''}</button>
            </td>`;
        }).join('');

        return `<tr>
            <th class="cal-cabin" scope="row">
                <strong>${esc(c.codigo)}</strong>
                <small>${esc(c.tipo)}</small>
            </th>
            ${celdas}
        </tr>`;
    }).join('');

    if (!cabanas.length) {
        cont.innerHTML = '<p class="cal-empty">No hay cabañas configuradas.</p>';
        return;
    }

    const head = dias.map(d => {
        const date = parseISO(d);
        const finde = [0, 6].includes(date.getDay());
        return `<th class="${finde ? 'cal-weekend' : ''} ${d === hoy ? 'cal-today' : ''}">
            <span style="display:block;font-size:.55rem;text-transform:uppercase">${diaSemanaCorto(date)}</span>
            ${date.getDate()}
        </th>`;
    }).join('');

    cont.innerHTML = `<table class="cal">
        <thead><tr><th class="cal-cabin">Cabaña</th>${head}</tr></thead>
        <tbody>${filas}</tbody>
    </table>`;

    qs('#cal-resumen').textContent = `${ocupadasHoy} ocupadas hoy${pendientes ? ` · ${pendientes} pendientes` : ''}`;

    qsa('[data-reserva]', cont).forEach(btn => btn.addEventListener('click', () => {
        const r = reservas.find(x => x.id === btn.dataset.reserva);
        if (r) verReservaCalendario(ctx, r);
    }));
    qsa('[data-libre]', cont).forEach(btn => btn.addEventListener('click', () => {
        const cabana = cabanas.find(c => c.id === btn.dataset.libre);
        ofrecerNueva(ctx, cabana, btn.dataset.dia);
    }));
}

function verReservaCalendario(ctx, r) {
    modal.open({
        title: r.codigo,
        narrow: true,
        body: `
            <div class="detail-banner" style="margin-bottom:.9rem">${tag(r.estado)} ${tag(r.estado_pago)}<span class="small muted">${esc(r.cabana)} · ${esc(r.tipo)}</span></div>
            <dl class="kv">
                <dt>Huésped</dt><dd><strong>${esc(r.huesped)}</strong></dd>
                <dt>Teléfono</dt><dd>${esc(r.telefono || '—')}</dd>
                <dt>Llegada</dt><dd>${esc(fechaMedia(r.fecha_entrada))}</dd>
                <dt>Salida</dt><dd>${esc(fechaMedia(r.fecha_salida))}</dd>
                <dt>Personas</dt><dd>${num(r.adultos)} adultos${num(r.ninos) ? `, ${num(r.ninos)} niños` : ''}</dd>
                <dt>Total</dt><dd>${esc(money(r.total))}</dd>
                <dt>Saldo</dt><dd>${esc(money(r.saldo))}</dd>
            </dl>`,
        footer: `<button class="btn btn--ghost" data-cerrar>Cerrar</button>
                 <button class="btn btn--primary" data-abrir>Ver en reservaciones</button>`
    });
    qs('#modal-foot [data-cerrar]').addEventListener('click', modal.close);
    qs('#modal-foot [data-abrir]').addEventListener('click', () => {
        modal.close();
        location.hash = `#/reservaciones?ver=${r.id}`;
    });
}

function ofrecerNueva(ctx, cabana, dia) {
    if (!ctx.esStaff) {
        toast('Tu rol es de solo consulta.', 'info');
        return;
    }
    modal.open({
        title: 'Cabaña disponible',
        narrow: true,
        body: `<p style="margin:0 0 .6rem"><strong>${esc(cabana.codigo)}</strong> · ${esc(cabana.tipo)}</p>
               <p class="muted small" style="margin:0">Disponible el ${esc(fechaLarga(dia))}. Puedes iniciar una reservación con esta cabaña y fecha de llegada.</p>`,
        footer: `<button class="btn btn--ghost" data-cerrar>Cancelar</button>
                 <button class="btn btn--primary" data-crear>Crear reservación</button>`
    });
    qs('#modal-foot [data-cerrar]').addEventListener('click', modal.close);
    qs('#modal-foot [data-crear]').addEventListener('click', () => {
        modal.close();
        location.hash = `#/reservaciones?nueva=1&entrada=${dia}&cabana=${cabana.id}`;
    });
}
