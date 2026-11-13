/* ============================================================
   Utilidades compartidas del panel
   ============================================================ */

import { APP } from './config.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/* ---------- Texto seguro ---------- */
export function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function attr(value) { return esc(value); }

export function initials(name) {
    return String(name || 'TR')
        .trim().split(/\s+/).slice(0, 2)
        .map(w => w[0] || '').join('').toUpperCase() || 'TR';
}

/* ---------- Fechas (siempre YYYY-MM-DD, sin desfase de zona) ---------- */
export function hoyISO() {
    const now = new Date();
    const local = new Date(now.toLocaleString('en-US', { timeZone: APP.zonaHoraria }));
    return toISO(local);
}

export function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function parseISO(iso) {
    if (!iso) return null;
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

export function addDays(iso, days) {
    const date = parseISO(iso) || new Date();
    date.setDate(date.getDate() + days);
    return toISO(date);
}

export function diffDays(desde, hasta) {
    const a = parseISO(desde);
    const b = parseISO(hasta);
    if (!a || !b) return 0;
    return Math.round((b - a) / 86400000);
}

export function fechaCorta(iso) {
    const d = parseISO(iso);
    if (!d) return '—';
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

export function fechaMedia(iso) {
    const d = parseISO(iso);
    if (!d) return '—';
    return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fechaLarga(iso) {
    const d = parseISO(iso);
    if (!d) return '—';
    return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function rangoTexto(desde, hasta) {
    return `${fechaCorta(desde)} → ${fechaCorta(hasta)} ${parseISO(hasta) ? parseISO(hasta).getFullYear() : ''}`.trim();
}

export function mesTexto(anio, mes) {
    return `${MESES[mes]} ${anio}`;
}

export function diaSemanaCorto(date) { return DIAS[date.getDay()]; }

export function esFinDeSemana(date) {
    const d = date.getDay();
    return d === 0 || d === 6;
}

export function horaTexto(isoDateTime) {
    if (!isoDateTime) return '—';
    const d = new Date(isoDateTime);
    return d.toLocaleString('es-HN', {
        timeZone: APP.zonaHoraria,
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

export function fechaHora(isoDateTime) {
    if (!isoDateTime) return '—';
    const d = new Date(isoDateTime);
    return d.toLocaleString('es-HN', {
        timeZone: APP.zonaHoraria,
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

/* ---------- Números y moneda ---------- */
export function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${APP.simbolo} ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function moneyShort(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${APP.simbolo} ${n.toLocaleString('es-HN', { maximumFractionDigits: 0 })}`;
}

export function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
}

export function plural(n, singular, pluralWord) {
    return `${n} ${n === 1 ? singular : pluralWord}`;
}

/* ---------- Estados ---------- */
export const ESTADOS = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    cancelada: 'Cancelada',
    completada: 'Completada',
    no_show: 'No se presentó',
    nueva: 'Nueva',
    en_revision: 'En revisión',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    convertida: 'Convertida',
    disponible: 'Disponible',
    mantenimiento: 'Mantenimiento',
    fuera_servicio: 'Fuera de servicio',
    pagado: 'Pagado',
    parcial: 'Pago parcial',
    preparada: 'Preparada',
    enviada: 'Enviada',
    fallida: 'Fallida',
};

export function estadoTexto(estado) {
    return ESTADOS[estado] || estado || '—';
}

export function tag(estado) {
    const safe = String(estado || 'neutral').replace(/[^a-z_]/gi, '');
    return `<span class="tag tag--${safe}">${esc(estadoTexto(estado))}</span>`;
}

export const METODOS_PAGO = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    tarjeta: 'Tarjeta',
    deposito: 'Depósito',
    otro: 'Otro',
};

export const ORIGENES = {
    manual: 'Manual',
    web: 'Página web',
    whatsapp: 'WhatsApp',
    telefono: 'Teléfono',
    presencial: 'Presencial',
};

/* ---------- DOM ---------- */
export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function on(root, event, selector, handler) {
    root.addEventListener(event, (e) => {
        const target = e.target.closest(selector);
        if (target && root.contains(target)) handler(e, target);
    });
}

export function setHTML(el, html) { if (el) el.innerHTML = html; }

export function formData(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
        if (value instanceof File) return;
        data[key] = typeof value === 'string' ? value.trim() : value;
    });
    return data;
}

export function debounce(fn, ms = 250) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

/* ---------- Toasts ---------- */
let toastTimer = 0;
export function toast(message, type = 'info', ms = 4200) {
    const stack = qs('#toast-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span>${esc(message)}</span><button type="button" aria-label="Cerrar">✕</button>`;
    el.querySelector('button').addEventListener('click', () => el.remove());
    stack.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.remove(), ms);
}

/* ---------- Modal ---------- */
export const modal = {
    el: null,
    box: null,
    title: null,
    body: null,
    foot: null,
    _onClose: null,

    init() {
        this.el = qs('#modal');
        this.box = qs('#modal-box');
        this.title = qs('#modal-title');
        this.body = qs('#modal-body');
        this.foot = qs('#modal-foot');
        this.el.addEventListener('close', () => {
            if (typeof this._onClose === 'function') this._onClose();
            this._onClose = null;
        });
        this.el.addEventListener('click', (e) => {
            if (e.target === this.el) this.close();
        });
    },

    open({ title, body, footer = '', wide = false, narrow = false, onClose = null }) {
        if (!this.el) this.init();
        this.title.textContent = title || '';
        this.body.innerHTML = body || '';
        this.foot.innerHTML = footer || '';
        this.el.classList.toggle('modal--wide', Boolean(wide));
        this.el.classList.toggle('modal--narrow', Boolean(narrow));
        this._onClose = onClose;
        if (!this.el.open) this.el.showModal();
        const first = this.body.querySelector('input:not([type=hidden]), select, textarea, button');
        if (first) setTimeout(() => first.focus(), 60);
        return { body: this.body, foot: this.foot };
    },

    close() {
        if (this.el && this.el.open) this.el.close();
    },

    footerButtons(buttons = []) {
        return buttons.map(b => `<button type="button" class="btn ${b.className || 'btn--ghost'}" data-action="${attr(b.action)}">${esc(b.label)}</button>`).join('');
    }
};

export function confirmar({ title = '¿Confirmar acción?', message = '', confirmText = 'Confirmar', danger = false, onConfirm }) {
    const { foot } = modal.open({
        title,
        narrow: true,
        body: `<p style="margin:0;color:var(--tinta-2)">${esc(message)}</p>`,
        footer: `<button type="button" class="btn btn--ghost" data-confirm="no">Cancelar</button>
                 <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-confirm="yes">${esc(confirmText)}</button>`
    });
    foot.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-confirm]');
        if (!btn) return;
        if (btn.dataset.confirm === 'yes') {
            modal.close();
            if (typeof onConfirm === 'function') onConfirm();
        } else {
            modal.close();
        }
    });
}

/* ---------- Plantillas HTML ---------- */
export function emptyRow(cols, message = 'No hay registros para mostrar.') {
    return `<tr class="empty-row"><td colspan="${cols}">${esc(message)}</td></tr>`;
}

export function loadingRows(cols, message = 'Cargando…') {
    return `<tr class="empty-row"><td colspan="${cols}">${esc(message)}</td></tr>`;
}

export function pageHead({ eyebrow, title, description, actions = '' }) {
    return `<div class="page-head">
        <div class="page-head__text">
            ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
            <h2>${esc(title)}</h2>
            ${description ? `<p>${esc(description)}</p>` : ''}
        </div>
        ${actions ? `<div class="page-head__actions">${actions}</div>` : ''}
    </div>`;
}

export function errorBox(el, message) {
    if (!el) return;
    el.innerHTML = `<p class="form__error">${esc(message)}</p>`;
}

/* ---------- Descargas ---------- */
export function descargarCSV(nombre, filas, columnas) {
    const head = columnas.map(c => `"${String(c.label).replace(/"/g, '""')}"`).join(',');
    const body = filas.map(fila => columnas.map(c => {
        const raw = typeof c.value === 'function' ? c.value(fila) : fila[c.key];
        return `"${String(raw ?? '').replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + head + '\r\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- Plantillas de mensajes ---------- */
export function renderPlantilla(plantilla, datos) {
    return String(plantilla || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key) => {
        const value = datos[key];
        return value === null || value === undefined ? '' : String(value);
    });
}

export function abrirWhatsApp(telefono, texto) {
    const digits = String(telefono || '').replace(/[^\d]/g, '');
    const numero = digits.length === 8 ? `504${digits}` : digits;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener');
}

export function abrirCorreo(email, asunto, cuerpo) {
    window.location.href = `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(asunto || '')}&body=${encodeURIComponent(cuerpo || '')}`;
}
