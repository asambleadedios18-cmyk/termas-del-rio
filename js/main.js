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

    // Aparición al hacer scroll (también para contenido creado después)
    function observar(root, selector) {
        var items = (root || document).querySelectorAll(selector || '.reveal');
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
    }
    observar();
    window.TermasUI = { observar: observar };

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

    // Lightbox de galería (delegado: funciona con fotos cargadas por JS)
    var box = document.getElementById('lightbox');
    if (box) {
        var img = box.querySelector('img');
        var cap = box.querySelector('figcaption');
        var actual = null;

        function enlaces() {
            return Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]')).filter(function (a) {
                return !a.closest('[hidden]') && a.offsetParent !== null;
            });
        }

        function show(enlace) {
            actual = enlace;
            img.src = enlace.getAttribute('href');
            img.alt = enlace.dataset.caption || '';
            cap.textContent = enlace.dataset.caption || '';
        }
        function close() {
            box.hidden = true;
            document.body.style.overflow = '';
            actual = null;
        }
        function mover(paso) {
            var lista = enlaces();
            var i = lista.indexOf(actual);
            if (i < 0) { close(); return; }
            show(lista[(i + paso + lista.length) % lista.length]);
        }

        document.addEventListener('click', function (e) {
            var a = e.target.closest('[data-lightbox]');
            if (!a) return;
            e.preventDefault();
            show(a);
            box.hidden = false;
            document.body.style.overflow = 'hidden';
        });
        box.querySelector('.lightbox__close').addEventListener('click', close);
        box.querySelector('.lightbox__prev').addEventListener('click', function () { mover(-1); });
        box.querySelector('.lightbox__next').addEventListener('click', function () { mover(1); });
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        document.addEventListener('keydown', function (e) {
            if (box.hidden) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') mover(-1);
            if (e.key === 'ArrowRight') mover(1);
        });
    }
})();
