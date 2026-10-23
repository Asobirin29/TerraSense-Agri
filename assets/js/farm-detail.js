// ============================================================
// TerraSense Agri — Farm Detail (Riwayat Lahan)
// Active planting cycle, activity timeline and past cycles of one farm.
// ============================================================

(() => {
    const { CycleUI } = window.TerraSense;
    const { esc } = CycleUI;

    let farm = null;
    let cycles = [];
    let legacyHarvests = [];
    let selectedCycleId = null;
    let selectedActivities = [];
    let typeFilter = 'all';

    document.addEventListener('DOMContentLoaded', async () => {
        const user = await App.checkAuth();
        if (!user) return;

        const farmId = parseInt(new URLSearchParams(window.location.search).get('id'));
        if (!farmId) {
            window.location.href = '/TerraSense-Agri/pages/dashboard.html';
            return;
        }

        document.querySelectorAll('#type-filter .type-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                typeFilter = chip.dataset.type;
                document.querySelectorAll('#type-filter .type-chip').forEach(c => c.classList.toggle('active', c === chip));
                renderTimeline();
            });
        });

        await loadAll(farmId);
    });

    async function loadAll(farmId = farm?.id) {
        try {
            const [farmRes, cycleRes] = await Promise.all([
                App.api(`farms.php?id=${farmId}`),
                App.api(`cycles.php?farm_id=${farmId}`),
            ]);
            const firstLoad = !farm;
            farm = farmRes.farm;
            cycles = cycleRes.cycles || [];
            legacyHarvests = cycleRes.legacy_harvests || [];

            if (firstLoad) renderHeader();
            await renderActiveCycle();
            renderHistory();

            // Keep the selected cycle if it still exists, else active / most recent
            if (!cycles.some(c => c.id == selectedCycleId)) {
                selectedCycleId = cycles[0]?.id ?? null;
            }
            await selectCycle(selectedCycleId);
        } catch (err) {
            document.getElementById('farm-name').textContent = 'Lahan tidak ditemukan';
            document.getElementById('active-cycle-body').innerHTML =
                `<div class="empty-state"><i class="ph ph-warning-circle"></i>${App.escapeHtml(err.message)}</div>`;
        }
    }

    // ---------- header + mini map ----------
    function renderHeader() {
        document.title = `${App.decodeEntities(farm.name)} - TerraSense Agri`;
        document.getElementById('farm-name').textContent = App.decodeEntities(farm.name);
        document.getElementById('btn-open-map').href = `/TerraSense-Agri/pages/farm-map.html?id=${encodeURIComponent(farm.id)}`;
        document.getElementById('farm-meta').innerHTML = `
            <span><i class="ph ph-ruler"></i> ${(parseFloat(farm.area_ha) || 0).toFixed(2)} Ha</span>
            <span>${App.getZoneEmoji(farm.zone)} ${App.escapeHtml(App.getZoneName(farm.zone))}</span>
            ${farm.elevation ? `<span><i class="ph ph-mountains"></i> ${Math.round(farm.elevation)} mdpl</span>` : ''}
            ${farm.irrigation_status ? `<span><i class="ph ph-drop"></i> ${esc(farm.irrigation_status)}</span>` : ''}`;

        const map = L.map('mini-map', { zoomControl: false, attributionControl: false, scrollWheelZoom: false });
        window.miniMap = map;
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
        try {
            const geo = typeof farm.geojson === 'string' ? JSON.parse(farm.geojson) : farm.geojson;
            const layer = L.geoJSON(geo, { style: { color: '#8fd496', weight: 2, fillOpacity: 0.15 } }).addTo(map);
            map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 17 }); // imagery runs out above ~17
        } catch (e) {
            if (farm.latitude && farm.longitude) map.setView([farm.latitude, farm.longitude], 15);
        }
    }

    // ---------- active cycle ----------
    async function renderActiveCycle() {
        const body = document.getElementById('active-cycle-body');
        const badge = document.getElementById('active-stage');
        const cycle = cycles.find(c => c.status === 'aktif');

        if (!cycle) {
            badge.style.display = 'none';
            body.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-plant"></i>
                    Lahan sedang kosong. Mulai musim tanam baru untuk mencatat pupuk, pengairan, dan panen.
                    <div style="margin-top:14px;"><button class="btn btn-sage" id="btn-start" type="button"><i class="ph-bold ph-plant"></i> Mulai Tanam</button></div>
                </div>`;
            document.getElementById('btn-start').onclick = async () => {
                if (await CycleUI.openStartCycle({ farm })) await loadAll();
            };
            return;
        }

        const g = CycleUI.growth(cycle);
        const s = cycle.summary;
        const estimate = await CycleUI.estimateYield(cycle.crop_name, parseFloat(cycle.area_ha) || parseFloat(farm.area_ha));
        badge.style.display = 'inline-flex';
        badge.textContent = g.stage;

        const fertText = s.fertilizers.length
            ? s.fertilizers.map(f => `${esc(f.name)} ${CycleUI.formatAmount(f.total)} ${esc(f.unit)}`).join('<br>')
            : 'Belum ada';

        body.innerHTML = `
            <div class="cycle-crop">${esc(cycle.crop_name)}</div>
            <div style="font-size:0.8rem;color:var(--bark-muted);">Ditanam ${App.formatDate(cycle.planting_date)} · perkiraan panen ${App.formatDate(addDays(cycle.planting_date, g.total))}</div>
            <div class="progress"><div class="progress-fill" style="width:${g.percent}%;"></div></div>
            <div class="progress-labels"><span>Hari ke-${g.days}</span><span>${g.total} Hari</span></div>

            <div class="mini-stats">
                <div class="mini-stat"><div class="mini-stat-label">Pupuk Diberikan</div><div class="mini-stat-sub" style="color:var(--bark);">${fertText}</div></div>
                <div class="mini-stat"><div class="mini-stat-label">Total Biaya</div><div class="mini-stat-val">${CycleUI.formatRupiah(s.total_cost)}</div>
                    <div class="mini-stat-sub">Benih ${CycleUI.formatRupiah(cycle.seed_cost)} · Kegiatan ${CycleUI.formatRupiah(s.activity_cost)}</div></div>
                <div class="mini-stat"><div class="mini-stat-label">Estimasi Panen</div><div class="mini-stat-val">${estimate !== null ? estimate.toLocaleString('id-ID') + ' Ton' : '-'}</div>
                    <div class="mini-stat-sub">${s.activity_count} kegiatan tercatat</div></div>
            </div>
            ${cycle.notes ? `<div class="tl-notes" style="margin-bottom:14px;">${esc(cycle.notes)}</div>` : ''}

            <div class="cycle-actions">
                <button class="btn btn-sage" data-act="activity" type="button"><i class="ph-bold ph-plus"></i> Catat Kegiatan</button>
                <button class="btn btn-terra" data-act="harvest" type="button"><i class="ph-bold ph-check-circle"></i> Catat Panen</button>
                <button class="btn btn-ghost" data-act="edit" type="button"><i class="ph ph-pencil-simple"></i> Ubah</button>
                <button class="btn btn-ghost" data-act="fail" type="button"><i class="ph ph-x-circle"></i> Gagal Panen</button>
            </div>`;

        const actions = {
            activity: () => CycleUI.openActivity({ cycle }),
            harvest:  () => CycleUI.openHarvest({ farm, cycle }),
            edit:     () => CycleUI.openEditCycle({ cycle }),
            fail:     () => CycleUI.openFail({ cycle }),
        };
        body.querySelectorAll('[data-act]').forEach(btn => {
            btn.onclick = async () => {
                if (await actions[btn.dataset.act]()) {
                    selectedCycleId = cycle.id;
                    await loadAll();
                }
            };
        });
    }

    function addDays(dateStr, days) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return CycleUI.isoDate(d);
    }

    // ---------- history of cycles ----------
    function renderHistory() {
        const list = document.getElementById('history-list');
        if (cycles.length === 0 && legacyHarvests.length === 0) {
            list.innerHTML = '<div class="empty-state"><i class="ph ph-clock-counter-clockwise"></i>Belum ada riwayat musim tanam.</div>';
            return;
        }

        const statusLabel = { aktif: 'Berjalan', dipanen: 'Dipanen', gagal: 'Gagal' };
        list.innerHTML = cycles.map(c => {
            const g = CycleUI.growth(c);
            const area = parseFloat(c.area_ha) || parseFloat(farm.area_ha) || 0;
            const actual = c.actual_yield_ton !== null ? parseFloat(c.actual_yield_ton) : null;
            const est = c.estimated_yield_ton !== null ? parseFloat(c.estimated_yield_ton) : null;
            const period = c.ended_at
                ? `${App.formatDate(c.planting_date)} → ${App.formatDate(c.ended_at)} (${g.days} hari)`
                : `Sejak ${App.formatDate(c.planting_date)} (hari ke-${g.days})`;
            const fert = c.summary.fertilizers.map(f => `${esc(f.name)} ${CycleUI.formatAmount(f.total)} ${esc(f.unit)}`).join(', ');
            return `
                <div class="history-item ${c.id == selectedCycleId ? 'selected' : ''}" data-cycle="${Number(c.id)}">
                    <div class="history-head">
                        <span class="history-crop">${esc(c.crop_name)}</span>
                        <span class="status-badge status-${c.status}">${statusLabel[c.status] || c.status}</span>
                    </div>
                    <div class="history-meta">${period}</div>
                    <div class="history-stats">
                        ${actual !== null ? `<span>Hasil <strong>${actual.toFixed(2)} Ton</strong>${area > 0 ? ` (${(actual / area).toFixed(2)} T/Ha)` : ''}</span>` : ''}
                        ${est !== null ? `<span>Estimasi ${est.toFixed(2)} Ton</span>` : ''}
                        <span>Biaya <strong>${CycleUI.formatRupiah(c.summary.total_cost)}</strong></span>
                        <span>${c.summary.activity_count} kegiatan</span>
                    </div>
                    ${fert ? `<div class="history-meta">Pupuk: ${fert}</div>` : ''}
                </div>`;
        }).join('') + legacyHarvests.map(h => `
            <div class="history-item" style="cursor:default;">
                <div class="history-head">
                    <span class="history-crop">${esc(h.crop_name)}</span>
                    <span class="status-badge status-dipanen">Dipanen</span>
                </div>
                <div class="history-meta">${App.formatDate(h.planting_date)} → ${App.formatDate(h.harvest_date)} · data lama (tanpa catatan kegiatan)</div>
                <div class="history-stats"><span>Hasil <strong>${parseFloat(h.actual_yield_ton).toFixed(2)} Ton</strong></span></div>
            </div>`).join('');

        list.querySelectorAll('[data-cycle]').forEach(item => {
            item.addEventListener('click', () => selectCycle(parseInt(item.dataset.cycle)));
        });
    }

    // ---------- timeline of selected cycle ----------
    async function selectCycle(cycleId) {
        selectedCycleId = cycleId;
        document.querySelectorAll('#history-list [data-cycle]').forEach(el => el.classList.toggle('selected', el.dataset.cycle == cycleId));

        const caption = document.getElementById('timeline-caption');
        if (!cycleId) {
            selectedActivities = [];
            caption.textContent = '';
            renderTimeline();
            return;
        }
        try {
            const res = await App.api(`cycles.php?action=detail&id=${cycleId}`);
            const c = res.cycle;
            selectedActivities = c.activities || [];
            caption.textContent = `${App.decodeEntities(c.crop_name)} · ${App.formatDate(c.planting_date)}`;

            // Harvest closes the timeline
            if (c.harvest) {
                selectedActivities.unshift({ type: '_panen', activity_date: c.harvest.harvest_date, harvest: c.harvest });
            } else if (c.status === 'gagal' && c.ended_at) {
                selectedActivities.unshift({ type: '_gagal', activity_date: c.ended_at });
            }
            selectedActivities.push({ type: '_tanam', activity_date: c.planting_date, cycle: c });
            renderTimeline(c.status === 'aktif');
        } catch (err) {
            App.toast(err.message, 'error');
        }
    }

    function renderTimeline(canDelete = cycles.find(c => c.id == selectedCycleId)?.status === 'aktif') {
        const ul = document.getElementById('timeline');
        const rows = selectedActivities.filter(a => typeFilter === 'all' || a.type === typeFilter || a.type.startsWith('_'));

        if (rows.length === 0) {
            ul.innerHTML = '<li class="empty-state"><i class="ph ph-note-blank"></i>Belum ada catatan kegiatan.</li>';
            return;
        }

        const milestone = {
            _tanam: { icon: 'ph-plant', label: 'Mulai Tanam', color: '#8fd496' },
            _panen: { icon: 'ph-basket', label: 'Panen', color: '#fde047' },
            _gagal: { icon: 'ph-x-circle', label: 'Gagal Panen', color: '#f0a282' },
        };

        ul.innerHTML = rows.map(a => {
            const meta = milestone[a.type] || CycleUI.ACTIVITY_META[a.type];
            let desc = '';
            if (a.type === '_tanam') desc = `${esc(a.cycle.crop_name)} · target ${a.cycle.expected_harvest_days} hari${a.cycle.seed_cost ? ' · benih ' + CycleUI.formatRupiah(a.cycle.seed_cost) : ''}`;
            else if (a.type === '_panen') desc = `Hasil ${parseFloat(a.harvest.actual_yield_ton).toFixed(2)} Ton${a.harvest.estimated_yield_ton !== null ? ` (estimasi ${parseFloat(a.harvest.estimated_yield_ton).toFixed(2)} Ton)` : ''}`;
            else if (!a.type.startsWith('_')) desc = CycleUI.describeActivity(a);
            const notes = a.type === '_panen' ? a.harvest.notes : (a.type.startsWith('_') ? '' : a.notes);

            return `
                <li class="tl-item">
                    <div class="tl-icon" style="color:${meta.color};border-color:${meta.color}40;"><i class="ph-fill ${meta.icon}"></i></div>
                    <div class="tl-body">
                        <div class="tl-head">
                            <span class="tl-type">${meta.label}</span>
                            <span class="tl-date">${App.formatDate(a.activity_date)}
                                ${canDelete && a.id ? `<button class="tl-del" data-del="${Number(a.id)}" title="Hapus catatan" type="button"><i class="ph ph-trash"></i></button>` : ''}
                            </span>
                        </div>
                        ${desc ? `<div class="tl-desc">${desc}</div>` : ''}
                        ${notes ? `<div class="tl-notes">${esc(notes)}</div>` : ''}
                        ${a.cost ? `<div class="tl-cost">${CycleUI.formatRupiah(a.cost)}</div>` : ''}
                    </div>
                </li>`;
        }).join('');

        ul.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', () => deleteActivity(parseInt(btn.dataset.del)));
        });
    }

    async function deleteActivity(id) {
        const confirm = await Swal.fire({
            title: 'Hapus catatan ini?',
            icon: 'warning',
            showCancelButton: true,
            background: '#141c14',
            color: '#f0e8d8',
            confirmButtonColor: '#c67b5c',
            cancelButtonColor: '#192019',
            confirmButtonText: 'Hapus',
            cancelButtonText: 'Batal',
        });
        if (!confirm.isConfirmed) return;
        try {
            const res = await App.api('activities.php?action=delete', { method: 'POST', body: JSON.stringify({ id }) });
            App.toast(res.message, 'success');
            await loadAll();
        } catch (err) {
            App.toast(err.message, 'error');
        }
    }
})();
