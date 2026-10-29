// ============================================================
// TerraSense Agri — Elevation Heatmap Module v2
// Custom Leaflet Canvas Layer with IDW interpolation.
// Clips precisely to polygon boundary, renders smooth
// elevation gradient (green→yellow→red) at pixel level.
// No external plugin needed — pure Leaflet + HTML5 Canvas.
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.ElevationHeatmap = (() => {

    // ── Internal state ────────────────────────────────────────
    let _map            = null;
    let _layer          = null;
    let _legendCtrl     = null;
    let _tooltipDiv     = null;
    let _mouseMoveHandler = null;
    let _mouseOutHandler  = null;
    let _gridPoints     = [];
    let _elevations     = [];
    let _minElev        = 0;
    let _maxElev        = 0;
    let _polygonFeature = null;
    let _visible        = false;
    let _initialized    = false;

    // 8×8 = 64 points — still 1 batch request to Open-Meteo (supports up to 100)
    const GRID_N = 8;

    // ── Color stops: green (low) → yellow → red (high) ───────
    const COLOR_STOPS = [
        [0.00, [22,  163,  74]],   // rich green
        [0.30, [101, 195,  60]],   // lime-green
        [0.55, [250, 204,  21]],   // yellow
        [0.78, [249, 115,  22]],   // orange
        [1.00, [220,  38,  38]],   // red
    ];

    function elevToRgb(t) {
        t = Math.max(0, Math.min(1, t));
        for (let i = 1; i < COLOR_STOPS.length; i++) {
            const [p0, c0] = COLOR_STOPS[i - 1];
            const [p1, c1] = COLOR_STOPS[i];
            if (t <= p1) {
                const f = (t - p0) / (p1 - p0);
                return c0.map((v, k) => Math.round(v + f * (c1[k] - v)));
            }
        }
        return COLOR_STOPS[COLOR_STOPS.length - 1][1];
    }

    // ── 1. Grid generation ───────────────────────────────────
    function generateGridPoints(polygonFeature, n = GRID_N) {
        const [w, s, e, north] = turf.bbox(polygonFeature);
        const latStep = (north - s) / (n - 1);
        const lonStep = (e - w)    / (n - 1);

        const candidates = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                candidates.push(turf.point([w + j * lonStep, s + i * latStep]));
            }
        }

        const inside = turf.pointsWithinPolygon(
            turf.featureCollection(candidates), polygonFeature
        );

        // Guarantee minimum 3 points (use bbox corners as fallback)
        if (inside.features.length < 4) {
            [[w,s],[e,s],[w,north],[e,north]].forEach(([ln,lt]) =>
                inside.features.push(turf.point([ln, lt]))
            );
        }

        return inside.features.map(f => ({
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
        }));
    }

    // ── 2. Batch elevation fetch ──────────────────────────────
    async function fetchGridElevations(points) {
        const lats = points.map(p => p.lat).join(',');
        const lons = points.map(p => p.lon).join(',');
        const res  = await fetch(
            `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`
        );
        if (!res.ok) throw new Error('Gagal memuat elevasi grid dari Open-Meteo');
        const data = await res.json();
        return data.elevation || points.map(() => 0);
    }

    // ── 3. Custom Leaflet Canvas Layer ───────────────────────
    // Uses IDW interpolation in pixel space and clips exactly to polygon.
    const ElevationCanvasLayer = L.Layer.extend({

        initialize(gp, ge, minE, maxE, poly) {
            this._gp   = gp;
            this._ge   = ge;
            this._minE = minE;
            this._maxE = maxE;
            this._poly = poly;
        },

        onAdd(map) {
            this._map    = map;
            this._canvas = L.DomUtil.create('canvas', 'elev-heatmap-canvas');
            this._canvas.style.cssText =
                'position:absolute;left:0;top:0;pointer-events:none;z-index:250;';
            map.getPanes().overlayPane.appendChild(this._canvas);

            this._boundReset = this._reset.bind(this);
            map.on('moveend zoomend viewreset', this._boundReset);
            this._reset();
            return this;
        },

        onRemove(map) {
            this._canvas?.parentNode?.removeChild(this._canvas);
            this._canvas = null;
            map.off('moveend zoomend viewreset', this._boundReset);
            return this;
        },

        _reset() {
            if (!this._map || !this._canvas) return;
            const size = this._map.getSize();
            this._canvas.width  = size.x;
            this._canvas.height = size.y;
            // Align canvas to container (layer pane may be offset during pan)
            const topLeft = this._map.containerPointToLayerPoint([0, 0]);
            L.DomUtil.setPosition(this._canvas, topLeft);
            this._redraw();
        },

        _redraw() {
            const map    = this._map;
            const canvas = this._canvas;
            if (!map || !canvas) return;

            const ctx  = canvas.getContext('2d');
            const size = map.getSize();
            ctx.clearRect(0, 0, size.x, size.y);

            // ── Build clip path from polygon ──────────────────
            const coords = this._poly.geometry.coordinates[0];
            ctx.save();
            ctx.beginPath();
            coords.forEach((c, i) => {
                const pt = map.latLngToContainerPoint([c[1], c[0]]);
                i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.clip();

            // ── Bounding box of polygon in container px ───────
            const pts  = coords.map(c => map.latLngToContainerPoint([c[1], c[0]]));
            const minX = Math.floor(Math.min(...pts.map(p => p.x)));
            const minY = Math.floor(Math.min(...pts.map(p => p.y)));
            const maxX = Math.ceil(Math.max( ...pts.map(p => p.x)));
            const maxY = Math.ceil(Math.max( ...pts.map(p => p.y)));
            const W    = Math.max(1, maxX - minX);
            const H    = Math.max(1, maxY - minY);

            // ── Adaptive resolution (bigger polygon → coarser pass) ──
            // Renders at 1/SCALE then upscales smoothly
            const SCALE = Math.max(2, Math.min(6, Math.ceil(Math.max(W, H) / 150)));
            const imgW  = Math.ceil(W / SCALE);
            const imgH  = Math.ceil(H / SCALE);

            // ── Pre-project grid points to container pixel space ──
            const projGP = this._gp.map(p =>
                map.latLngToContainerPoint([p.lat, p.lon])
            );

            const ge    = this._ge;
            const minE  = this._minE;
            const range = (this._maxE - minE) || 1;

            // ── Off-screen render ──────────────────────────────
            const off    = document.createElement('canvas');
            off.width    = imgW;
            off.height   = imgH;
            const offCtx = off.getContext('2d');
            const img    = offCtx.createImageData(imgW, imgH);
            const px     = img.data;

            for (let py = 0; py < imgH; py++) {
                for (let px2 = 0; px2 < imgW; px2++) {
                    // Center of this pixel in container space
                    const cx = minX + px2 * SCALE + SCALE / 2;
                    const cy = minY + py  * SCALE + SCALE / 2;

                    // IDW power-2 in pixel space
                    let num = 0, den = 0;
                    for (let k = 0; k < projGP.length; k++) {
                        const dx = cx - projGP[k].x;
                        const dy = cy - projGP[k].y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < 0.1) { num = ge[k]; den = 1; break; }
                        const w  = 1 / d2;
                        num += w * ge[k];
                        den += w;
                    }

                    const t = ((num / den) - minE) / range;
                    const [r, g, b] = elevToRgb(t);
                    const idx = (py * imgW + px2) * 4;
                    px[idx]     = r;
                    px[idx + 1] = g;
                    px[idx + 2] = b;
                    px[idx + 3] = 195; // alpha ≈ 0.76
                }
            }

            offCtx.putImageData(img, 0, 0);

            // ── Scale up with smooth interpolation ────────────
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(off, minX, minY, W, H);
            ctx.restore(); // removes clip path
        },
    });

    // ── 4. Legend control ─────────────────────────────────────
    function buildLegend(minE, maxE) {
        const ctrl = L.control({ position: 'bottomleft' });
        ctrl.onAdd = () => {
            const div = L.DomUtil.create('div', 'elev-heatmap-legend');
            div.innerHTML = `
                <div class="elev-legend-title">
                    <i class="ph-fill ph-mountains"></i> Elevasi Lahan
                </div>
                <div class="elev-legend-bar"></div>
                <div class="elev-legend-labels">
                    <span>${Math.round(minE)} m</span>
                    <span>${Math.round((minE + maxE) / 2)} m</span>
                    <span>${Math.round(maxE)} m</span>
                </div>`;
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        };
        return ctrl;
    }

    // ── 5. Hover tooltip ──────────────────────────────────────
    function createTooltipDiv() {
        const existing = document.getElementById('elev-heatmap-tooltip');
        if (existing) existing.remove();
        const div = document.createElement('div');
        div.id = 'elev-heatmap-tooltip';
        div.style.cssText = `
            display:none;position:fixed;pointer-events:none;z-index:3000;
            background:rgba(8,13,8,0.90);border:1px solid rgba(122,184,128,0.40);
            color:#f0e8d8;padding:6px 12px;border-radius:9px;
            font-size:0.75rem;font-family:'Inter',system-ui,sans-serif;
            white-space:nowrap;backdrop-filter:blur(8px);
            box-shadow:0 4px 20px rgba(0,0,0,0.5);`;
        document.body.appendChild(div);
        return div;
    }

    // IDW elevation estimate at a latlng using sampled grid
    function idwElevation(latlng) {
        let num = 0, den = 0;
        _gridPoints.forEach((p, i) => {
            const d2 = Math.pow(p.lat - latlng.lat, 2) + Math.pow(p.lon - latlng.lng, 2);
            if (d2 < 1e-12) { num = _elevations[i]; den = 1; return; }
            const w  = 1 / d2;
            num += w * _elevations[i];
            den += w;
        });
        return den > 0 ? num / den : null;
    }

    // ── 6. Mouse listeners ────────────────────────────────────
    function attachHoverListeners() {
        const container = _map.getContainer();

        _mouseMoveHandler = (e) => {
            if (!_visible || !_tooltipDiv || !_polygonFeature) return;
            const rect   = container.getBoundingClientRect();
            const latlng = _map.containerPointToLatLng(
                L.point(e.clientX - rect.left, e.clientY - rect.top)
            );
            if (!turf.booleanPointInPolygon(turf.point([latlng.lng, latlng.lat]), _polygonFeature)) {
                _tooltipDiv.style.display = 'none';
                return;
            }
            const elev = idwElevation(latlng);
            if (elev === null) return;
            _tooltipDiv.innerHTML =
                `<i class="ph ph-mountains" style="color:#7ab880;margin-right:4px;"></i>Elevasi ≈ <strong>${Math.round(elev)} MDPL</strong>`;
            _tooltipDiv.style.display = 'block';
            _tooltipDiv.style.left    = (e.clientX + 16) + 'px';
            _tooltipDiv.style.top     = (e.clientY - 12) + 'px';
        };

        _mouseOutHandler = () => {
            if (_tooltipDiv) _tooltipDiv.style.display = 'none';
        };

        container.addEventListener('mousemove', _mouseMoveHandler);
        container.addEventListener('mouseleave', _mouseOutHandler);
    }

    function detachHoverListeners() {
        const c = _map?.getContainer();
        if (!c) return;
        if (_mouseMoveHandler) c.removeEventListener('mousemove', _mouseMoveHandler);
        if (_mouseOutHandler)  c.removeEventListener('mouseleave', _mouseOutHandler);
        _mouseMoveHandler = _mouseOutHandler = null;
    }

    // ── Toggle button sync ────────────────────────────────────
    function syncToggleBtn(visible) {
        const btn = document.getElementById('heatmap-toggle-btn');
        if (!btn) return;
        btn.classList.toggle('active', visible);
        const label = btn.querySelector('span:last-child');
        if (label) label.textContent = visible ? 'Sembunyikan' : 'Heatmap Elevasi';
    }

    // ── Public API ────────────────────────────────────────────

    async function init(map, polygonFeature, autoShow = true) {
        destroy();
        _map            = map;
        _polygonFeature = polygonFeature;

        const btn = document.getElementById('heatmap-toggle-btn');
        const lbl = btn?.querySelector('span:last-child');
        if (btn) { btn.disabled = true; if (lbl) lbl.textContent = 'Memuat…'; }

        try {
            _gridPoints  = generateGridPoints(polygonFeature);
            _elevations  = await fetchGridElevations(_gridPoints);
            _minElev     = Math.min(..._elevations);
            _maxElev     = Math.max(..._elevations);

            _layer       = new ElevationCanvasLayer(
                _gridPoints, _elevations, _minElev, _maxElev, polygonFeature
            );
            _legendCtrl  = buildLegend(_minElev, _maxElev);
            _tooltipDiv  = createTooltipDiv();
            _initialized = true;

            if (autoShow) show();
        } catch (err) {
            console.warn('[ElevationHeatmap] init error:', err);
            if (btn) { btn.disabled = false; if (lbl) lbl.textContent = 'Heatmap Elevasi'; }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    function show() {
        if (!_initialized || !_map) return;
        if (_layer      && !_map.hasLayer(_layer))   _layer.addTo(_map);
        if (_legendCtrl && !_legendCtrl._map)         _legendCtrl.addTo(_map);
        attachHoverListeners();
        _visible = true;
        syncToggleBtn(true);
    }

    function hide() {
        if (!_map) return;
        if (_layer      && _map.hasLayer(_layer))    _map.removeLayer(_layer);
        if (_legendCtrl && _legendCtrl._map)          _legendCtrl.remove();
        if (_tooltipDiv) _tooltipDiv.style.display = 'none';
        detachHoverListeners();
        _visible = false;
        syncToggleBtn(false);
    }

    function toggle() { _visible ? hide() : show(); }

    function destroy() {
        hide();
        _tooltipDiv?.parentNode?.removeChild(_tooltipDiv);
        _layer = null; _legendCtrl = null; _tooltipDiv = null;
        _gridPoints = []; _elevations = [];
        _polygonFeature = null;
        _initialized = false; _visible = false;
        syncToggleBtn(false);
    }

    function isVisible() { return _visible; }

    return { init, show, hide, toggle, destroy, isVisible };
})();
