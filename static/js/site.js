(function() {
    // Core composer on the home page: one pressed option per layer, mirrored into the rootfs.conf preview.
    document.querySelectorAll('[data-composer]').forEach((composer) => {
        composer.addEventListener('click', (e) => {
            const button = e.target.closest('.composer__option');
            if (!button) return;
            const layer = button.dataset.layer;
            composer.querySelectorAll(`.composer__option[data-layer="${layer}"]`).forEach((b) => {
                b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
            });
            const value = composer.querySelector(`[data-conf="${layer}"]`);
            if (value) value.textContent = button.dataset.value;
        });
    });

    // Code blocks in prose get a bar with the language and a copy button.
    document.querySelectorAll('.prose .highlight').forEach((block) => {
        const code = block.querySelector('code');
        if (!code) return;
        const bar = document.createElement('div');
        bar.className = 'code-bar';
        const lang = document.createElement('span');
        const name = code.dataset.lang;
        lang.textContent = name && name !== 'fallback' ? name : 'text';
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'code-bar__copy';
        copy.textContent = 'copy';
        copy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ''));
                copy.textContent = 'copied';
            } catch (err) {
                copy.textContent = 'copy failed';
            }
            setTimeout(() => { copy.textContent = 'copy'; }, 1500);
        });
        bar.append(lang, copy);
        block.prepend(bar);
    });

    // The docs menu is a collapsed <details> on small screens and always open on wide ones.
    const docsNav = document.querySelector('[data-docs-nav]');
    if (docsNav) {
        const wide = window.matchMedia('(min-width: 64.0625rem)');
        const sync = () => { docsNav.open = wide.matches; };
        sync();
        wide.addEventListener('change', sync);
    }

    // Package index filter: hides cards that do not match and letter groups left empty.
    const filter = document.querySelector('[data-pkg-filter]');
    if (filter) {
        const groups = document.querySelectorAll('[data-pkg-group]');
        const empty = document.querySelector('[data-pkg-empty]');
        filter.addEventListener('input', () => {
            const query = filter.value.trim().toLowerCase();
            let shown = 0;
            groups.forEach((group) => {
                let visible = 0;
                group.querySelectorAll('[data-pkg-card]').forEach((card) => {
                    card.hidden = query !== '' && !card.textContent.toLowerCase().includes(query);
                    if (!card.hidden) visible++;
                });
                group.hidden = visible === 0;
                shown += visible;
            });
            if (empty) empty.hidden = shown !== 0;
        });
        // "/" focuses the filter, as the hint inside it says.
        document.addEventListener('keydown', (e) => {
            if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
            const tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            e.preventDefault();
            filter.focus();
        });
    }

    // Install card on package pages: binary/source tabs.
    document.querySelectorAll('[data-install]').forEach((card) => {
        const tabs = [...card.querySelectorAll('[role="tab"]')];
        const select = (tab) => {
            tabs.forEach((t) => {
                const on = t === tab;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
                document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
            });
        };
        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => select(tab));
            tab.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
                select(next);
                next.focus();
            });
        });
    });

    // Buttons that copy a fixed string.
    document.querySelectorAll('[data-copy]').forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copy);
                button.textContent = 'copied';
            } catch (err) {
                button.textContent = 'copy failed';
            }
            setTimeout(() => { button.textContent = 'copy'; }, 1500);
        });
    });

    // stable/master switch: a highlight slides to the clicked branch before the page changes.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.querySelectorAll('[data-branch-switch]').forEach((nav) => {
        const current = nav.querySelector('[aria-current]');
        if (!current) return;
        const thumb = document.createElement('span');
        thumb.className = 'branch-switch__thumb';
        thumb.setAttribute('aria-hidden', 'true');
        const place = (opt) => {
            nav.style.setProperty('--thumb-x', `${opt.offsetLeft}px`);
            nav.style.setProperty('--thumb-w', `${opt.offsetWidth}px`);
        };
        // First placement without a transition, so the highlight does not slide in on load.
        thumb.style.transition = 'none';
        nav.prepend(thumb);
        place(current);
        nav.classList.add('branch-switch--js');
        thumb.getBoundingClientRect();
        thumb.style.transition = '';
        window.addEventListener('resize', () => place(nav.querySelector('.is-target') || current));
        // Web fonts change the option widths once they load.
        if (document.fonts) document.fonts.ready.then(() => place(nav.querySelector('.is-target') || current));
        // Back/forward cache restores the page as it was left; put the highlight back.
        window.addEventListener('pageshow', (e) => {
            if (!e.persisted) return;
            nav.querySelectorAll('.is-target, .is-leaving').forEach((o) => o.classList.remove('is-target', 'is-leaving'));
            place(current);
        });

        nav.querySelectorAll('a.branch-switch__opt').forEach((link) => {
            link.addEventListener('click', (e) => {
                if (reduceMotion.matches || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                current.classList.add('is-leaving');
                link.classList.add('is-target');
                place(link);
                setTimeout(() => { window.location.href = link.href; }, 260);
            });
        });
    });

    // Dependency graph full screen toggle.
    document.querySelectorAll('[data-graph]').forEach((panel) => {
        const button = panel.querySelector('[data-fullscreen]');
        if (!button) return;
        if (!panel.requestFullscreen) {
            button.hidden = true;
            return;
        }
        button.addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else panel.requestFullscreen();
        });
        document.addEventListener('fullscreenchange', () => {
            button.textContent = document.fullscreenElement === panel ? 'exit full screen' : 'full screen';
        });
    });
})();
