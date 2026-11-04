// Casio Scientific Calculator Controller for NoteRenderer 0.8.0
(function() {
    let hostEl = null;
    let root = null;
    let calcMachine = null;
    let isOpen = false;
    let isScreenOpen = false;
    let place = undefined;
    let screenPlace = undefined;
    let scale = 1;
    let screenScale = 1;

    // Load saved preferences
    try {
        const p = JSON.parse(localStorage.getItem("prefs") || "{}");
        if (p.calc) {
            if (p.calc.x !== undefined && p.calc.y !== undefined) place = { x: p.calc.x, y: p.calc.y };
            if (p.calc.scale) scale = p.calc.scale;
            if (p.calc.screen) {
                if (p.calc.screen.x !== undefined && p.calc.screen.y !== undefined) screenPlace = { x: p.calc.screen.x, y: p.calc.screen.y };
                if (p.calc.screen.scale) screenScale = p.calc.screen.scale;
                if (p.calc.screen.open) isScreenOpen = true;
            }
        }
    } catch (_) {}

    function getAutoFitScale() {
        if (window.innerHeight < 680) {
            return Math.max(0.68, Number(((window.innerHeight - 60) / 610).toFixed(2)));
        }
        return 1;
    }

    function clampPlace(p) {
        const curScale = scale || getAutoFitScale();
        const calcW = Math.round(314 * curScale);
        const calcH = Math.round(590 * curScale);
        const maxX = Math.max(16, window.innerWidth - calcW - 16);
        const maxY = Math.max(30, window.innerHeight - calcH - 16);
        if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || p.x > maxX || p.y > maxY || p.x < 10 || p.y < 30) {
            const btn = document.getElementById('tb-btn-casio-calc');
            if (btn) {
                const r = btn.getBoundingClientRect();
                return {
                    x: Math.max(16, Math.min(maxX, r.left)),
                    y: Math.max(30, Math.min(maxY, r.bottom + 6))
                };
            }
            return {
                x: Math.max(16, Math.min(maxX, window.innerWidth - calcW - 20)),
                y: Math.max(30, Math.min(maxY, 65))
            };
        }
        return {
            x: Math.max(16, Math.min(maxX, p.x)),
            y: Math.max(30, Math.min(maxY, p.y))
        };
    }

    function savePrefs(patch) {
        try {
            const p = JSON.parse(localStorage.getItem("prefs") || "{}");
            p.calc = { ...p.calc, ...patch };
            localStorage.setItem("prefs", JSON.stringify(p));
        } catch (_) {}
    }

    function ensureEngine() {
        if (!window.CasioCalc && typeof window.initCasioEngine === 'function') {
            window.initCasioEngine();
        }
    }

    function ensureHost() {
        if (!hostEl) {
            hostEl = document.createElement('div');
            hostEl.id = 'casio-calc-host';
            hostEl.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;overflow:visible;';
            document.body.appendChild(hostEl);
        }
        if (!root && window.__NR_ReactDOM) {
            root = window.__NR_ReactDOM.createRoot(hostEl);
        }
        return root;
    }

    function updateToolbarBtnState() {
        const btn = document.getElementById('tb-btn-casio-calc');
        if (btn) {
            if (isOpen) {
                btn.classList.add('on');
            } else {
                btn.classList.remove('on');
            }
        }
    }

    function renderCalc() {
        ensureEngine();
        if (!window.__NR_React || !window.__NR_ReactDOM || !window.CasioCalc) {
            setTimeout(renderCalc, 100);
            return;
        }

        const r = ensureHost();
        if (!r) {
            setTimeout(renderCalc, 100);
            return;
        }

        if (isOpen) {
            place = clampPlace(place);
        }

        if (!calcMachine && window.CasioCalc) {
            calcMachine = new window.CasioCalc.Machine();
            try {
                const p = JSON.parse(localStorage.getItem("prefs") || "{}");
                if (p.calc && p.calc.mem) calcMachine.load(p.calc.mem);
            } catch (_) {}
        }

        const O = window.__NR_React;
        const u = window.__NR_JSX;
        if (!O || !u || !window.CasioCalc) return;

        const { Dee, Bee } = window.CasioCalc;

        function CalcContainer() {
            const [, forceUpdate] = O.useState(0);

            O.useEffect(() => {
                const sub = () => forceUpdate(n => n + 1);
                window.CasioCalc.D2.add(sub);
                return () => window.CasioCalc.D2.delete(sub);
            }, []);

            if (!isOpen) return null;

            return u.jsxs("div", {
                style: { pointerEvents: "auto" },
                children: [
                    u.jsx(Dee, {
                        machine: calcMachine,
                        place: place,
                        onPlace: p => { place = clampPlace(p); savePrefs(place); forceUpdate(n => n + 1); },
                        scale: scale,
                        onScale: s => { scale = s; savePrefs({ scale: s }); forceUpdate(n => n + 1); },
                        screen: isScreenOpen,
                        onScreen: () => {
                            isScreenOpen = !isScreenOpen;
                            savePrefs({ screen: { ...screenPlace, open: isScreenOpen, scale: screenScale } });
                            forceUpdate(n => n + 1);
                        },
                        onClose: () => {
                            window.closeCasioCalculator();
                        }
                    }),
                    isScreenOpen && u.jsx(Bee, {
                        machine: calcMachine,
                        place: screenPlace,
                        onPlace: p => { screenPlace = p; savePrefs({ screen: { ...screenPlace, ...p, open: isScreenOpen, scale: screenScale } }); forceUpdate(n => n + 1); },
                        scale: screenScale,
                        onScale: s => { screenScale = s; savePrefs({ screen: { ...screenPlace, scale: s, open: isScreenOpen } }); forceUpdate(n => n + 1); },
                        onClose: () => {
                            isScreenOpen = false;
                            savePrefs({ screen: { ...screenPlace, open: false, scale: screenScale } });
                            forceUpdate(n => n + 1);
                        }
                    })
                ]
            });
        }

        r.render(u.jsx(CalcContainer, {}));
        updateToolbarBtnState();
    }

    window.openCasioCalculator = function() {
        isOpen = true;
        if (scale === 1 && window.innerHeight < 680) {
            scale = getAutoFitScale();
        }
        place = clampPlace(place);
        renderCalc();
        if (typeof window.showToast === 'function') window.showToast('Đã mở Máy tính khoa học Casio FX 580', 'info');
    };

    window.closeCasioCalculator = function() {
        isOpen = false;
        renderCalc();
    };

    window.toggleCasioCalculator = function() {
        isOpen = !isOpen;
        if (isOpen) {
            if (scale === 1 && window.innerHeight < 680) {
                scale = getAutoFitScale();
            }
            place = clampPlace(place);
            if (typeof window.showToast === 'function') window.showToast('Đã mở Máy tính khoa học Casio FX 580', 'info');
        }
        renderCalc();
    };

    // Inject toolbar button
    function ensureToolbarButton() {
        if (document.getElementById('tb-btn-casio-calc')) return;

        const dock = document.getElementById('nb-tools-dock');
        const toolbar = document.querySelector('.toolbar');
        if (!toolbar) return;

        const btn = document.createElement('button');
        btn.id = 'tb-btn-casio-calc';
        btn.className = 'tb';
        btn.title = 'Máy tính khoa học (Casio)';
        btn.setAttribute('aria-label', 'Máy tính');
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="2.5" width="14" height="19" rx="2"></rect>
                <rect x="8" y="5.5" width="8" height="4" rx="0.5"></rect>
                <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16h.01M12 16h.01M15.5 16h.01M8.5 19h.01M12 19h.01M15.5 19h.01" stroke-width="2.2"></path>
            </svg>
        `;
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.toggleCasioCalculator();
        };

        const toolsGroup = toolbar.querySelector('.tb-group.tools');
        if (toolsGroup) {
            toolsGroup.appendChild(btn);
        } else if (dock) {
            dock.appendChild(btn);
        }
    }

    // Auto init observer
    function tryInit() {
        if (window.__NR_React && window.__NR_ReactDOM) {
            ensureEngine();
            ensureToolbarButton();
        } else {
            setTimeout(tryInit, 200);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }

    setInterval(ensureToolbarButton, 1000);
})();
