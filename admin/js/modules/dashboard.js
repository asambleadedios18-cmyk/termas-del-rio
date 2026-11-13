/* Módulo · Panel general */
import { rpc } from '../db.js';
import { icon } from '../icons.js';
import {
    esc, money, moneyShort, num, tag, fechaCorta, fechaMedia, addDays, hoyISO,
    pct, plural, horaTexto, qsa, qs
} from '../util.js';

export const meta = {
    id: 'dashboard',
    title: 'Panel general',
    eyebrow: 'Operación',
    icon: icon('grid'),
    roles: ['admin', 'recepcion', 'consulta'],
};

export async function render(el, ctx) {
    const d = await rpc('dashboard_resumen');
    const hoy = d.hoy || hoyISO();
    const totalCabanas = num(d.disponibles_hoy) + num(d.ocupadas_hoy) + num(d.fuera_servicio);
    const ocupacion = num(d.ocupacion_pct);

    el.innerHTML = `
        <section class="dash-hero">
            <div>
                <p class="eyebrow eyebrow--light">${esc(ctx.nombreNegocio())}</p>
                <h2>${saludo()}, ${esc((ctx.perfil?.nombre || '').split(' ')[0] || 'bienvenido')}.</h2>
                <p>Esto es lo que está pasando hoy en las cabañas. Revisa llegadas, salidas y solicitudes pendientes antes de confirmar nuevas reservaciones.</p>
                <div class="dash-hero__chips">
                    <span class="chip"><strong>${num(d.alojados)}</strong> cabañas ocupadas</span>
                    <span class="chip"><strong>${num(d.disponibles_hoy)}</strong> disponibles hoy</span>
                    <span class="chip"><strong>${num(d.llegadas_hoy)}</strong> llegadas hoy</span>
                    <span class="chip"><strong>${num(d.salidas_hoy)}</strong> salidas hoy</span>
                </div>
            </div>
        </section>

        <div class="grid grid--stats" style="margin-bottom:1rem">
            ${stat('Reservaciones pendientes', num(d.pendientes), 'Por revisar y confirmar', icon('clock'), 'gold', '#/reservaciones?estado=pendiente')}
            ${stat('Reservaciones confirmadas', num(d.confirmadas), `${num(d.confirmadas_futuras)} con salida futura`, icon('check'), '', '#/reservaciones?estado=confirmada')}
            ${stat('Huéspedes alojados', num(d.alojados_personas), `${plural(num(d.alojados), 'cabaña ocupada', 'cabañas ocupadas')}`, icon('users'), '', '#/calendario')}
            ${stat('Cabañas disponibles', num(d.disponibles_hoy), `de ${totalCabanas} en inventario`, icon('bed'), '', '#/cabanas')}
            ${stat('Próximas llegadas', num(d.proximas_llegadas), 'En los próximos 7 días', icon('arrow'), '', '#/reservaciones?estado=confirmada')}
            ${stat('Próximas salidas', num(d.proximas_salidas), 'En los próximos 7 días', icon('logout'), '', '#/reservaciones?estado=confirmada')}
            ${stat('Ingresos del mes', moneyShort(d.ingresos_mes), 'Pagos registrados', icon('card'), 'gold', '#/pagos')}
            ${stat('Saldo por cobrar', moneyShort(d.saldo_pendiente), 'Reservaciones activas', icon('alert'), 'gold', '#/pagos?estado=parcial')}
        </div>

        <div class="grid grid--sidebar" style="margin-bottom:1rem">
            <div class="card">
                <div class="card__head">
                    <div>
                        <h3>Ocupación de cabañas</h3>
                        <p>Últimos 15 días y próximos 15 días · ${esc(money(d.ingresos_total))} cobrados en total</p>
                    </div>
                    <div class="card__tools">
                        <a class="btn btn--ghost btn--sm" href="#/calendario">Ver calendario ${icon('right')}</a>
                    </div>
                </div>
                <div class="card__body">
                    <div class="bars" role="img" aria-label="Gráfico de ocupación diaria">
                        ${barrasOcupacion(d.ocupacion_diaria || [], hoy, totalCabanas)}
                    </div>
                    <div style="display:flex;align-items:center;gap:.8rem;margin-top:1rem">
                        <div class="progress" style="flex:1"><span style="width:${Math.min(100, ocupacion)}%"></span></div>
                        <strong style="font-size:.78rem;color:var(--bosque)">${ocupacion}% ocupado hoy</strong>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card__head"><div><h3>Ingresos por mes</h3><p>Pagos registrados en los últimos 6 meses</p></div></div>
                <div class="card__body">
                    ${barrasIngresos(d.ingresos_mensuales || [])}
                    <div style="margin-top:1rem;padding-top:.9rem;border-top:1px solid var(--linea-2);display:flex;justify-content:space-between;font-size:.78rem">
                        <span class="muted">Total histórico</span>
                        <strong style="color:var(--bosque)">${esc(money(d.ingresos_total))}</strong>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid--2">
            <div class="card">
                <div class="card__head">
                    <div><h3>Próximas llegadas</h3><p>Reservaciones confirmadas · 7 días</p></div>
                    <div class="card__tools"><a class="btn btn--ghost btn--sm" href="#/reservaciones?estado=confirmada">Todas</a></div>
                </div>
                <div class="card__body">${listaMovimientos(d.llegadas, 'entrada')}</div>
            </div>
            <div class="card">
                <div class="card__head">
                    <div><h3>Próximas salidas</h3><p>Reservaciones confirmadas · 7 días</p></div>
                    <div class="card__tools"><a class="btn btn--ghost btn--sm" href="#/reservaciones?estado=confirmada">Todas</a></div>
                </div>
                <div class="card__body">${listaMovimientos(d.salidas, 'salida')}</div>
            </div>
        </div>

        <div class="grid grid--3" style="margin-top:1rem">
            ${acceso('Registrar reservación', 'Crea una reservación manual y verifica disponibilidad al instante.', '#/reservaciones?nueva=1', icon('plus'))}
            ${acceso('Revisar solicitudes web', `${num(ctx.nuevas)} solicitud(es) nueva(s) en la bandeja.`, '#/solicitudes', icon('inbox'))}
            ${acceso('Configurar tarifas', 'Precios por noche, temporadas y datos del negocio.', '#/cabanas', icon('card'))}
        </div>
    `;
}

function saludo() {
    const h = Number(new Date().toLocaleString('en-US', {
        timeZone: 'America/Tegucigalpa', hour: '2-digit', hour12: false
    }));
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
}

function stat(label, value, hint, ico, variante = '', href = '') {
    return `<article class="stat ${variante === 'gold' ? 'stat--gold' : ''}">
        <span class="stat__icon">${ico}</span>
        <span class="stat__label">${esc(label)}</span>
        <span class="stat__value">${esc(value)}</span>
        <span class="stat__hint">${esc(hint)}</span>
        ${href ? `<a href="${href}">Ver detalle →</a>` : ''}
    </article>`;
}

function barrasOcupacion(dias, hoy, total) {
    if (!dias.length) return '<p class="empty">Sin datos de ocupación.</p>';
    const max = Math.max(1, total, ...dias.map(d => num(d.ocupadas)));
    return dias.map((d, i) => {
        const alto = Math.max(2, Math.round((num(d.ocupadas) / max) * 100));
        const esHoy = d.fecha === hoy;
        const mostrar = esHoy || i % 5 === 0;
        return `<div class="bars__item" title="${esc(fechaMedia(d.fecha))}: ${num(d.ocupadas)} ocupadas">
            <div class="bars__bar ${esHoy ? 'bars__bar--today' : ''}" style="height:${alto}%"></div>
            <span class="bars__label">${mostrar ? esc(fechaCorta(d.fecha)) : '·'}</span>
        </div>`;
    }).join('');
}

function barrasIngresos(meses) {
    if (!meses.length) return '<p class="empty">Aún no hay pagos registrados.</p>';
    const max = Math.max(1, ...meses.map(m => num(m.total)));
    return `<div class="bars" style="height:110px">${meses.map(m => {
        const alto = Math.max(2, Math.round((num(m.total) / max) * 100));
        const [y, mes] = String(m.mes).split('-');
        const label = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(mes) - 1] || '';
        return `<div class="bars__item" title="${esc(m.mes)}: ${esc(money(m.total))}">
            <div class="bars__bar" style="height:${alto}%"></div>
            <span class="bars__label">${label}${mes === '01' ? ` ${y.slice(2)}` : ''}</span>
        </div>`;
    }).join('')}</div>
    <p class="small muted" style="margin:.6rem 0 0">Máximo del período: ${esc(money(max))}</p>`;
}

function listaMovimientos(items, tipo) {
    if (!items || !items.length) {
        return `<p class="empty">No hay ${tipo === 'entrada' ? 'llegadas' : 'salidas'} confirmadas en los próximos 7 días.</p>`;
    }
    return `<ul class="list">${items.slice(0, 6).map(r => {
        const fecha = tipo === 'entrada' ? r.fecha_entrada : r.fecha_salida;
        return `<li>
            <span class="list__date"><strong>${esc(fechaCorta(fecha).split(' ')[0])}</strong><small>${esc(fechaCorta(fecha).split(' ')[1] || '')}</small></span>
            <span class="list__body">
                <strong>${esc(r.huesped || 'Huésped')}</strong>
                <small>${esc(r.cabana || '')} · ${esc(r.tipo || '')} · ${num(r.adultos)} adultos${num(r.ninos) ? `, ${num(r.ninos)} niños` : ''}</small>
                <small>${esc(r.codigo || '')}${r.telefono ? ` · ${esc(r.telefono)}` : ''}</small>
            </span>
            <span class="list__side">
                ${num(r.saldo) > 0 ? `<span class="tag tag--parcial">${esc(moneyShort(r.saldo))}</span>` : '<span class="tag tag--pagado">Pagado</span>'}
            </span>
        </li>`;
    }).join('')}</ul>`;
}

function acceso(titulo, texto, href, ico) {
    return `<a class="card" href="${href}" style="padding:1rem 1.1rem;text-decoration:none;display:flex;gap:.8rem;align-items:flex-start">
        <span class="stat__icon" style="position:static;flex:0 0 auto">${ico}</span>
        <span>
            <strong style="display:block;font-family:var(--serif);color:var(--bosque);font-size:1rem;margin-bottom:.15rem">${esc(titulo)}</strong>
            <small class="muted" style="font-size:.75rem">${esc(texto)}</small>
        </span>
    </a>`;
}
