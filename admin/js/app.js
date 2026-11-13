/* ============================================================
   TERMAS DEL RÍO · Panel de reservaciones
   Arranque, sesión, navegación y enrutador
   ============================================================ */

import { APP, isConfigured } from './config.js';
import { db, iniciarSesion, cerrarSesion, sesionActual, cargarPerfil, recuperarContrasena, cargarAjuste } from './db.js';
import { qs, qsa, esc, toast, modal, initials, hoyISO, fechaLarga, horaTexto } from './util.js';

import * as dashboard from './modules/dashboard.js';
import * as reservaciones from './modules/reservaciones.js';
import * as calendario from './modules/calendario.js';
import * as solicitudes from './modules/solicitudes.js';
import * as cabanas from './modules/cabanas.js';
import * as huespedes from './modules/huespedes.js';
import * as pagos from './modules/pagos.js';
import * as ajustes from './modules/ajustes.js';

const MODULOS = { dashboard, reservaciones, calendario, solicitudes, cabanas, huespedes, pagos, ajustes };

const GRUPOS = [
    { label: 'Operación', ids: ['dashboard', 'reservaciones', 'calendario', 'solicitudes'] },
    { label: 'Hospedaje', ids: ['cabanas', 'huespedes'] },
    { label: 'Finanzas', ids: ['pagos'] },
    { label: 'Administración', ids: ['ajustes'] },
];

export const state = {
    session: null,
    perfil: null,
    correo: '',
    ajustes: { negocio: null, reservas: null, pago_instrucciones: null, plantillas: null },
    nuevas: 0,
    canal: null,
    cargando: false,
};

const ctx = {
    get session() { return state.session; },
    get perfil() { return state.perfil; },
    get nuevas() { return state.nuevas; },
    get ajustes() { return state.ajustes; },
    get plantillas() { return state.ajustes.plantillas || {}; },
    get esAdmin() { return state.perfil?.rol === 'admin'; },
    get esStaff() { return ['admin', 'recepcion'].includes(state.perfil?.rol); },
    get puedeEditar() { return this.esStaff; },
    toast,
    modal,
    go: navegar,
    recargarAvisos: refrescarNuevas,
    recargarAjustes: cargarAjustes,
    plantilla: (nombre) => (state.ajustes.plantillas || {})[nombre] || '',
    nombreNegocio: () => state.ajustes.negocio?.nombre || APP.nombre,
};

/* ============================================================
   Arranque
   ============================================================ */
document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
    qs('#build-version').textContent = `v${APP.version}`;
    qs('#today-label').textContent = fechaLarga(hoyISO());

    if (!isConfigured()) {
        qs('#boot').hidden = true;
        qs('#setup').hidden = false;
        return;
    }

    configurarLogin();
    prepararShell();

    try {
        const session = await sesionActual();
        if (session) {
            await entrarAlPanel(session);
        } else {
            mostrarLogin();
        }
    } catch (error) {
        mostrarLogin(String(error?.message || 'No se pudo comprobar la sesión.'));
    }

    db.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            state.session = null;
            state.perfil = null;
            desconectarCanal();
            mostrarLogin();
        }
        if (event === 'TOKEN_REFRESHED' && session) {
            state.session = session;
        }
    });
}

/* ============================================================
   Sesión
   ============================================================ */
function configurarLogin() {
    const form = qs('#login-form');
    const error = qs('#login-error');
    const btn = qs('#login-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        error.hidden = true;
        const email = form.email.value.trim();
        const password = form.password.value;
        if (!email || !password) {
            error.textContent = 'Escribe tu correo y contraseña.';
            error.hidden = false;
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Verificando…';
        try {
            const data = await iniciarSesion(email, password);
            await entrarAlPanel(data.session);
        } catch (err) {
            error.textContent = String(err.message || err);
            error.hidden = false;
            btn.disabled = false;
            btn.textContent = 'Entrar al panel';
        }
    });

    qs('[data-toggle-password]', form).addEventListener('click', (e) => {
        const input = form.password;
        const ver = input.type === 'password';
        input.type = ver ? 'text' : 'password';
        e.currentTarget.textContent = ver ? 'Ocultar' : 'Ver';
        e.currentTarget.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });

    qs('#forgot').addEventListener('click', async () => {
        const email = form.email.value.trim();
        if (!email) {
            error.textContent = 'Escribe primero tu correo electrónico.';
            error.hidden = false;
            return;
        }
        try {
            await recuperarContrasena(email);
            toast('Te enviamos un enlace para restablecer la contraseña.', 'ok');
        } catch (err) {
            toast(String(err.message || err), 'error');
        }
    });
}

function mostrarLogin(mensaje = '') {
    qs('#boot').hidden = true;
    qs('#app').hidden = true;
    qs('#setup').hidden = true;
    qs('#login').hidden = false;
    const error = qs('#login-error');
    if (mensaje) {
        error.textContent = mensaje;
        error.hidden = false;
    }
    const btn = qs('#login-submit');
    btn.disabled = false;
    btn.textContent = 'Entrar al panel';
    qs('#login-form').password.value = '';
}

async function entrarAlPanel(session) {
    if (!session) return mostrarLogin();

    let perfil = null;
    try {
        perfil = await cargarPerfil(session.user.id);
    } catch (error) {
        await cerrarSesion();
        return mostrarLogin(String(error.message || error));
    }

    if (!perfil) {
        await cerrarSesion();
        return mostrarLogin('Tu usuario no tiene perfil en el panel. Contacta al administrador.');
    }
    if (!perfil.activo) {
        await cerrarSesion();
        return mostrarLogin('Tu cuenta existe pero está pendiente de activación. Contacta al administrador.');
    }

    state.session = session;
    state.perfil = perfil;
    state.correo = session.user.email || perfil.email || '';

    qs('#boot').hidden = true;
    qs('#login').hidden = true;
    qs('#setup').hidden = true;
    qs('#app').hidden = false;

    pintarUsuario();
    await cargarAjustes();
    pintarNavegacion();
    await refrescarNuevas();
    conectarCanal();

    if (!location.hash || location.hash === '#' || location.hash === '#/') {
        location.hash = '#/dashboard';
    }
    await enrutar();
}

function cerrarSesionPanel() {
    modal.close();
    cerrarSesion().finally(() => {
        location.hash = '';
        state.perfil = null;
        state.session = null;
        mostrarLogin();
    });
}

/* ============================================================
   Carga de ajustes y avisos
   ============================================================ */
async function cargarAjustes() {
    try {
        const [negocio, reservas, pago, plantillas] = await Promise.all([
            cargarAjuste('negocio'),
            cargarAjuste('reservas'),
            cargarAjuste('pago_instrucciones'),
            cargarAjuste('plantillas'),
        ]);
        state.ajustes = { negocio, reservas, pago_instrucciones: pago, plantillas: plantillas || {} };
    } catch (error) {
        toast(`No se pudieron cargar los ajustes: ${error.message || error}`, 'error');
    }
}

async function refrescarNuevas() {
    if (!db) return;
    try {
        const { count } = await db.from('solicitudes')
            .select('id', { count: 'exact', head: true })
            .eq('estado', 'nueva');
        state.nuevas = count || 0;
        const badge = qs('#bell-count');
        badge.hidden = state.nuevas === 0;
        badge.textContent = state.nuevas > 99 ? '99+' : String(state.nuevas);
        const navCount = qs('[data-count="solicitudes"]');
        if (navCount) {
            navCount.hidden = state.nuevas === 0;
            navCount.textContent = state.nuevas > 99 ? '99+' : String(state.nuevas);
        }
    } catch {
        /* silencioso: no bloquea el panel */
    }
}

function conectarCanal() {
    desconectarCanal();
    if (!db) return;
    state.canal = db.channel('panel-reservaciones')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitudes' }, (payload) => {
            const s = payload.new || {};
            refrescarNuevas();
            toast(`Nueva solicitud web de ${s.nombre || 'un visitante'} (${s.codigo || ''})`, 'info', 7000);
            if (location.hash.startsWith('#/solicitudes') || location.hash.startsWith('#/dashboard')) {
                enrutar(true);
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservaciones' }, () => {
            if (['#/dashboard', '#/calendario', '#/reservaciones'].some(h => location.hash.startsWith(h))) {
                enrutar(true);
            }
        })
        .subscribe();
}

function desconectarCanal() {
    if (state.canal && db) {
        db.removeChannel(state.canal);
        state.canal = null;
    }
}

/* ============================================================
   Shell
   ============================================================ */
function prepararShell() {
    qs('#logout').addEventListener('click', () => {
        modal.open({
            title: 'Cerrar sesión',
            narrow: true,
            body: '<p style="margin:0;color:var(--tinta-2)">¿Deseas salir del panel de reservaciones?</p>',
            footer: `<button type="button" class="btn btn--ghost" data-x="no">Cancelar</button>
                     <button type="button" class="btn btn--primary" data-x="si">Cerrar sesión</button>`
        });
        qs('#modal-foot').onclick = (e) => {
            const b = e.target.closest('[data-x]');
            if (!b) return;
            if (b.dataset.x === 'si') cerrarSesionPanel();
            else modal.close();
        };
    });

    const userBtn = qs('#user-btn');
    const pop = qs('#user-pop');
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.hidden = !pop.hidden;
        userBtn.setAttribute('aria-expanded', String(!pop.hidden));
    });
    document.addEventListener('click', (e) => {
        if (!pop.hidden && !e.target.closest('.user-menu')) {
            pop.hidden = true;
            userBtn.setAttribute('aria-expanded', 'false');
        }
    });

    const sidebar = qs('#sidebar');
    const backdrop = qs('#sidebar-backdrop');
    const toggle = qs('#menu-toggle');
    const cerrarMenu = () => {
        sidebar.classList.remove('is-open');
        backdrop.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
        const abrir = !sidebar.classList.contains('is-open');
        sidebar.classList.toggle('is-open', abrir);
        backdrop.hidden = !abrir;
        toggle.setAttribute('aria-expanded', String(abrir));
    });
    backdrop.addEventListener('click', cerrarMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

    qs('#bell').addEventListener('click', () => navegar('#/solicitudes?estado=nueva'));

    window.addEventListener('hashchange', () => { cerrarMenu(); enrutar(); });
    window.addEventListener('online', () => toast('Conexión restablecida.', 'ok', 2500));
    window.addEventListener('offline', () => toast('Sin conexión. Los cambios no se guardarán.', 'error', 6000));
}

function pintarUsuario() {
    const nombre = state.perfil?.nombre || state.correo || 'Usuario';
    qs('#user-name').textContent = nombre;
    qs('#user-role').textContent = state.perfil?.rol === 'admin' ? 'Administrador'
        : state.perfil?.rol === 'recepcion' ? 'Recepción' : 'Consulta';
    qs('#user-email').textContent = state.correo;
    qs('#user-avatar').textContent = initials(nombre);
}

function pintarNavegacion() {
    const nav = qs('#nav-admin');
    const rol = state.perfil?.rol || 'consulta';
    nav.innerHTML = GRUPOS.map(grupo => {
        const links = grupo.ids.map(id => {
            const mod = MODULOS[id];
            if (!mod || !mod.meta.roles.includes(rol)) return '';
            return `<a class="nav-admin__link" href="#/${id}" data-nav="${id}">
                <span class="nav-admin__icon" aria-hidden="true">${mod.meta.icon}</span>
                <span>${esc(mod.meta.title)}</span>
                ${id === 'solicitudes' ? `<span class="nav-admin__count" data-count="solicitudes" ${state.nuevas ? '' : 'hidden'}>${state.nuevas}</span>` : ''}
            </a>`;
        }).join('');
        return links ? `<div class="nav-admin__group"><p class="nav-admin__label">${esc(grupo.label)}</p>${links}</div>` : '';
    }).join('');
}

/* ============================================================
   Enrutador
   ============================================================ */
function navegar(hash) {
    if (location.hash === hash) enrutar();
    else location.hash = hash;
}

function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [id, query] = raw.split('?');
    return { id: id || 'dashboard', params: new URLSearchParams(query || '') };
}

async function enrutar(silencioso = false) {
    if (!state.perfil) return;

    const { id, params } = parseHash();
    const mod = MODULOS[id] || MODULOS.dashboard;
    const rol = state.perfil.rol;

    if (!mod.meta.roles.includes(rol)) {
        toast('No tienes acceso a ese módulo.', 'error');
        return navegar('#/dashboard');
    }

    qsa('.nav-admin__link').forEach(a => a.classList.toggle('is-active', a.dataset.nav === id));
    qs('#page-title').textContent = mod.meta.title;
    qs('#page-eyebrow').textContent = mod.meta.eyebrow || 'Panel';

    const cont = qs('#contenido-admin');
    if (!silencioso) {
        cont.innerHTML = `<div class="skeleton skeleton--title"></div>
            <div class="skeleton-grid"><div class="skeleton skeleton--card"></div><div class="skeleton skeleton--card"></div><div class="skeleton skeleton--card"></div><div class="skeleton skeleton--card"></div></div>
            <div class="skeleton skeleton--table"></div>`;
    }

    try {
        await mod.render(cont, ctx, params);
    } catch (error) {
        if (String(error?.message || '').toLowerCase().includes('sesión expiró')) {
            mostrarLogin('Tu sesión expiró. Vuelve a iniciar sesión.');
            return;
        }
        console.error(error);
        cont.innerHTML = `<div class="card"><div class="card__body" style="padding:1.4rem">
            <h3 style="margin-bottom:.4rem">No se pudo cargar el módulo</h3>
            <p class="muted">${esc(error?.message || error)}</p>
            <button class="btn btn--primary" id="retry">Reintentar</button>
        </div></div>`;
        qs('#retry')?.addEventListener('click', () => enrutar());
    }

    if (!silencioso) cont.focus({ preventScroll: true });
}

/* Exponer utilidades para depuración controlada */
window.__termasPanel = { state, navigate: navegar, refresh: () => enrutar() };
