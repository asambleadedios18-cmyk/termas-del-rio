(function () {
    document.documentElement.classList.add('js');

    // Menú móvil
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('nav');
    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        nav.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') {
                nav.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Sombra del encabezado al hacer scroll
    var header = document.querySelector('.site-header');
    var onScroll = function () {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Aparición al hacer scroll
    var items = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -60px 0px' });
        items.forEach(function (el) { io.observe(el); });
    } else {
        items.forEach(function (el) { el.classList.add('is-visible'); });
    }

    // Menú del restaurante: botones Anterior / Siguiente de cada categoría
    document.querySelectorAll('.menu__cat').forEach(function (cat) {
        var track = cat.querySelector('.menu__track');
        var nav = cat.querySelector('.menu__nav');
        if (!track || !nav) return;
        var prev = nav.querySelector('[data-dir="-1"]');
        var next = nav.querySelector('[data-dir="1"]');
        var update = function () {
            var max = track.scrollWidth - track.clientWidth;
            nav.hidden = max <= 4;
            prev.disabled = track.scrollLeft <= 4;
            next.disabled = track.scrollLeft >= max - 4;
        };
        nav.addEventListener('click', function (e) {
            var btn = e.target.closest('button');
            if (!btn) return;
            var card = track.querySelector('.menu__card');
            var step = card ? card.getBoundingClientRect().width + 19 : track.clientWidth * 0.8;
            track.scrollBy({ left: step * Number(btn.getAttribute('data-dir')), behavior: 'smooth' });
        });
        track.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    });

    // Lightbox de galería
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    var box = document.getElementById('lightbox');
    if (!links.length || !box) return;
    var img = box.querySelector('img');
    var cap = box.querySelector('figcaption');
    var current = 0;

    function show(i) {
        current = (i + links.length) % links.length;
        img.src = links[current].getAttribute('href');
        img.alt = links[current].dataset.caption || '';
        cap.textContent = links[current].dataset.caption || '';
    }
    function close() {
        box.hidden = true;
        document.body.style.overflow = '';
    }
    links.forEach(function (a, i) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            show(i);
            box.hidden = false;
            document.body.style.overflow = 'hidden';
        });
    });
    box.querySelector('.lightbox__close').addEventListener('click', close);
    box.querySelector('.lightbox__prev').addEventListener('click', function () { show(current - 1); });
    box.querySelector('.lightbox__next').addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(current - 1);
        if (e.key === 'ArrowRight') show(current + 1);
    });
})();
