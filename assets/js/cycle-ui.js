// ============================================================
// TerraSense Agri — Planting Cycle UI (Musim Tanam)
// Shared helpers + SweetAlert dialogs for starting a cycle, recording
// activities (pupuk / pengairan / observasi), harvest and crop failure.
// Used by farm-map.html and farm-detail.html. Requires App + Swal.
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.CycleUI = (() => {
    const DEFAULT_HARVEST_DAYS = 100;
    let cropsCache = null;

    // API text is stored HTML-escaped; decode then escape for innerHTML
    const esc = (v) => App.escapeHtml(App.decodeEntities(v));
    // Local Y-m-d (toISOString would shift the date in UTC+7 before 07:00)
    const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = () => isoDate(new Date());

    const swalTheme = {
        background: '#141c14',
        color: '#f0e8d8',
        confirmButtonColor: '#5a8a60',
        cancelButtonColor: '#192019',
        showCancelButton: true,
        cancelButtonText: 'Batal',
        focusConfirm: false,
    };

    function injectStyles() {
        if (document.getElementById('cycle-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'cycle-ui-styles';
        style.textContent = `
            .cy-form { text-align:left; display:flex; flex-direction:column; gap:10px; font-size:0.85rem; }
            .cy-form label { display:block; font-size:0.72rem; color:rgba(240,232,216,0.55); margin-bottom:4px; }
            .cy-form input, .cy-form select, .cy-form textarea {
                width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
                color:#f0e8d8; padding:8px 10px; border-radius:8px; outline:none; font:inherit; box-sizing:border-box; }
            .cy-form select option { background:#141c14; }
            .cy-form input:focus, .cy-form select:focus, .cy-form textarea:focus { border-color:#5a8a60; }
            .cy-row { display:flex; gap:10px; }
            .cy-row > div { flex:1; min-width:0; }
            .cy-tabs { display:flex; gap:6px; flex-wrap:wrap; }
            .cy-tab { flex:1; padding:7px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.12);
                background:transparent; color:rgba(240,232,216,0.6); cursor:pointer; font:inherit; font-size:0.78rem; }
            .cy-tab.active { background:rgba(90,138,96,0.18); border-color:#5a8a60; color:#8fd496; font-weight:600; }
            .cy-hint { font-size:0.7rem; color:rgba(240,232,216,0.45); }
            .cy-form .cy-dose { display:flex; align-items:center; gap:8px; padding:8px; margin:0; border:1px solid rgba(255,255,255,0.08);
                border-radius:8px; font-size:0.82rem; color:#f0e8d8; }
            .cy-dose input[type=checkbox] { width:auto; }
            .cy-dose input[type=number] { width:96px; }
            .cy-dose span { flex:1; }
        `;
        document.head.appendChild(style);
    }

    // ---------- crop reference data (assets/data/crops.json) ----------
    async function loadCrops() {
        if (cropsCache) return cropsCache;
        try {
            const res = await fetch('/TerraSense-Agri/assets/data/crops.json');
            cropsCache = res.ok ? await res.json() : [];
        } catch (e) {
            cropsCache = [];
        }
        return cropsCache;
    }

    /** Match a crop name (e.g. "Kopi Robusta", "Ubi Jalar") to crops.json for harvest days & yield. */
    async function findCropInfo(name) {
        const crops = await loadCrops();
        const n = App.decodeEntities(name || '').toLowerCase().trim();
        if (!n) return null;
        return crops.find(c => c.name.toLowerCase() === n || c.id === n)
            || crops.find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))
            || crops.find(c => c.name.toLowerCase().split(' ')[0] === n.split(' ')[0])
            || null;
    }

    async function estimateYield(cropName, areaHa) {
        const info = await findCropInfo(cropName);
        if (!info || !info.yield_ton_per_ha || !(areaHa > 0)) return null;
        return Math.round(info.yield_ton_per_ha * areaHa * 100) / 100;
    }

    function growth(cycle, refDate = new Date()) {
        const start = new Date(cycle.planting_date + 'T00:00:00');
        const end = cycle.ended_at ? new Date(cycle.ended_at + 'T00:00:00') : refDate;
        const days = Math.max(0, Math.floor((end - start) / 86400000));
        const total = parseInt(cycle.expected_harvest_days) || DEFAULT_HARVEST_DAYS;
        const percent = Math.min(100, Math.round((days / total) * 100));
        const stage = percent >= 90 ? 'Siap Panen' : (percent > 40 ? 'Generatif' : 'Vegetatif');
        return { days, total, percent, stage };
    }

    function formatRupiah(v) {
        return 'Rp ' + Math.round(Number(v) || 0).toLocaleString('id-ID');
    }

    function formatAmount(v) {
        const n = Number(v) || 0;
        return n % 1 === 0 ? n.toLocaleString('id-ID') : n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
    }

    // ---------- activity presentation ----------
    const ACTIVITY_META = {
        pupuk:     { icon: 'ph-flask',          label: 'Pemupukan', color: '#8fd496' },
        pengairan: { icon: 'ph-drop',           label: 'Pengairan', color: '#6bb5e0' },
        observasi: { icon: 'ph-magnifying-glass', label: 'Observasi', color: '#eab308' },
        lainnya:   { icon: 'ph-note-pencil',    label: 'Lainnya',   color: '#c67b5c' },
    };

    /** One-line HTML summary of an activity row. */
    function describeActivity(a) {
        const parts = [];
        if (a.type === 'pupuk') {
            parts.push(`<strong>${esc(a.fertilizer_name)}</strong> ${formatAmount(a.amount)} ${esc(a.unit)}`);
            if (a.fertilizer_phase) parts.push(`fase ${esc(a.fertilizer_phase)}`);
        } else if (a.type === 'pengairan') {
            parts.push(a.water_method ? esc(a.water_method) : 'Penyiraman');
            if (a.duration_min) parts.push(`${a.duration_min} menit`);
        } else if (a.type === 'observasi') {
            if (a.growth_stage) parts.push(esc(a.growth_stage));
            if (a.plant_height_cm) parts.push(`tinggi ${formatAmount(a.plant_height_cm)} cm`);
            if (a.condition) parts.push(`kondisi ${esc(a.condition)}`);
            if (a.pest_disease) parts.push(`hama/penyakit: ${esc(a.pest_disease)}`);
        }
        return parts.join(' · ');
    }

    // ---------- dialogs ----------
    async function post(endpoint, body) {
        return App.api(endpoint, { method: 'POST', body: JSON.stringify(body) });
    }

    /** Start a planting cycle on a farm. crop: optional evaluation object { id_komoditas, nama_komoditas }. */
    async function openStartCycle({ farm, crop = null }) {
        injectStyles();
        const cropName = crop ? crop.nama_komoditas : '';
        const info = cropName ? await findCropInfo(cropName) : null;

        const result = await Swal.fire({
            ...swalTheme,
            title: 'Mulai Musim Tanam',
            confirmButtonText: 'Mulai Tanam',
            html: `
                <div class="cy-form">
                    <div class="cy-hint">Lahan: <strong>${esc(farm.name)}</strong> · ${(parseFloat(farm.area_ha) || 0).toFixed(2)} Ha</div>
                    <div><label>Tanaman / Komoditas</label><input id="cy-crop" value="${App.escapeHtml(cropName)}" placeholder="Contoh: Padi Sawah"></div>
                    <div class="cy-row">
                        <div><label>Tanggal Tanam</label><input id="cy-date" type="date" value="${today()}" max="${today()}"></div>
                        <div><label>Umur Panen (hari)</label><input id="cy-days" type="number" min="1" value="${info?.harvest_days || DEFAULT_HARVEST_DAYS}"></div>
                    </div>
                    <div><label>Biaya Benih / Bibit (Rp, opsional)</label><input id="cy-seed-cost" type="number" min="0" step="1000" placeholder="0"></div>
                    <div><label>Catatan (varietas, sumber benih, dll.)</label><input id="cy-notes" placeholder="Opsional"></div>
                </div>`,
            preConfirm: async () => {
                const body = {
                    farm_id: farm.id,
                    komoditas_id: crop ? crop.id_komoditas : null,
                    crop_name: document.getElementById('cy-crop').value.trim(),
                    planting_date: document.getElementById('cy-date').value,
                    expected_harvest_days: document.getElementById('cy-days').value,
                    seed_cost: document.getElementById('cy-seed-cost').value,
                    notes: document.getElementById('cy-notes').value.trim(),
                };
                if (!body.crop_name || !body.planting_date) {
                    Swal.showValidationMessage('Nama tanaman dan tanggal tanam wajib diisi');
                    return false;
                }
                try {
                    return await post('cycles.php?action=start', body);
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            },
        });
        if (result.isConfirmed) App.toast(result.value.message || 'Musim tanam dimulai!', 'success');
        return result.isConfirmed;
    }

    /** Edit crop, planting date, harvest days, seed cost & notes of a cycle. */
    async function openEditCycle({ cycle }) {
        injectStyles();
        const result = await Swal.fire({
            ...swalTheme,
            title: 'Ubah Musim Tanam',
            confirmButtonText: 'Simpan',
            html: `
                <div class="cy-form">
                    <div><label>Tanaman / Komoditas</label><input id="cy-crop" value="${esc(cycle.crop_name)}"></div>
                    <div class="cy-row">
                        <div><label>Tanggal Tanam</label><input id="cy-date" type="date" value="${cycle.planting_date}" max="${today()}"></div>
                        <div><label>Umur Panen (hari)</label><input id="cy-days" type="number" min="1" value="${parseInt(cycle.expected_harvest_days) || DEFAULT_HARVEST_DAYS}"></div>
                    </div>
                    <div><label>Biaya Benih / Bibit (Rp)</label><input id="cy-seed-cost" type="number" min="0" step="1000" value="${cycle.seed_cost ?? ''}"></div>
                    <div><label>Catatan</label><textarea id="cy-notes" rows="2">${esc(cycle.notes)}</textarea></div>
                </div>`,
            preConfirm: async () => {
                try {
                    return await post('cycles.php?action=update', {
                        id: cycle.id,
                        crop_name: document.getElementById('cy-crop').value.trim(),
                        planting_date: document.getElementById('cy-date').value,
                        expected_harvest_days: document.getElementById('cy-days').value,
                        seed_cost: document.getElementById('cy-seed-cost').value,
                        notes: document.getElementById('cy-notes').value.trim(),
                    });
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            },
        });
        if (result.isConfirmed) App.toast(result.value.message, 'success');
        return result.isConfirmed;
    }

    /** Record one activity. type: initial tab ('pupuk' | 'pengairan' | 'observasi' | 'lainnya'). */
    async function openActivity({ cycle, type = 'pupuk' }) {
        injectStyles();
        const g = growth(cycle);
        const result = await Swal.fire({
            ...swalTheme,
            title: 'Catat Kegiatan Lahan',
            confirmButtonText: 'Simpan',
            html: `
                <div class="cy-form">
                    <div class="cy-hint">${esc(cycle.crop_name)} · Hari ke-${g.days}</div>
                    <div class="cy-tabs">
                        ${Object.entries(ACTIVITY_META).map(([key, m]) => `
                            <button type="button" class="cy-tab ${key === type ? 'active' : ''}" data-type="${key}">
                                <i class="ph ${m.icon}"></i> ${m.label}
                            </button>`).join('')}
                    </div>
                    <div><label>Tanggal</label><input id="cy-date" type="date" value="${today()}" min="${cycle.planting_date}" max="${today()}"></div>

                    <div data-section="pupuk" class="cy-form">
                        <div class="cy-row">
                            <div><label>Jenis Pupuk</label><input id="cy-fert-name" list="cy-fert-list" placeholder="Urea, SP-36, KCl, NPK...">
                                <datalist id="cy-fert-list"><option>Urea</option><option>SP-36</option><option>KCl</option><option>NPK Phonska</option><option>ZA</option><option>Pupuk Kandang</option><option>Kompos</option><option>Pupuk Organik Cair</option></datalist>
                            </div>
                            <div><label>Fase</label><select id="cy-fert-phase">
                                <option value="">-</option><option>Dasar (Basal)</option><option>Vegetatif</option><option>Generatif</option><option>Susulan</option>
                            </select></div>
                        </div>
                        <div class="cy-row">
                            <div><label>Jumlah</label><input id="cy-amount" type="number" min="0" step="0.01"></div>
                            <div><label>Satuan</label><select id="cy-unit"><option>kg</option><option>karung</option><option>liter</option><option>gram</option><option>ml</option></select></div>
                        </div>
                    </div>

                    <div data-section="pengairan" class="cy-form">
                        <div class="cy-row">
                            <div><label>Metode</label><select id="cy-water-method">
                                <option>Penyiraman manual</option><option>Irigasi alur/genangan</option><option>Irigasi tetes</option><option>Sprinkler</option><option>Pompa air</option>
                            </select></div>
                            <div><label>Durasi (menit)</label><input id="cy-duration" type="number" min="0"></div>
                        </div>
                    </div>

                    <div data-section="observasi" class="cy-form">
                        <div class="cy-row">
                            <div><label>Fase Tumbuh</label><select id="cy-stage">
                                <option>Perkecambahan</option><option ${g.stage === 'Vegetatif' ? 'selected' : ''}>Vegetatif</option><option ${g.stage === 'Generatif' ? 'selected' : ''}>Generatif</option><option ${g.stage === 'Siap Panen' ? 'selected' : ''}>Pematangan</option>
                            </select></div>
                            <div><label>Tinggi Tanaman (cm)</label><input id="cy-height" type="number" min="0" step="0.1"></div>
                        </div>
                        <div class="cy-row">
                            <div><label>Kondisi</label><select id="cy-condition"><option value="baik">Baik</option><option value="sedang">Sedang</option><option value="buruk">Buruk</option></select></div>
                            <div><label>Hama / Penyakit</label><input id="cy-pest" placeholder="Opsional"></div>
                        </div>
                    </div>

                    <div><label>Biaya (Rp, opsional)</label><input id="cy-cost" type="number" min="0" step="1000" placeholder="0"></div>
                    <div><label id="cy-notes-label">Catatan</label><textarea id="cy-notes" rows="2" placeholder="Opsional"></textarea></div>
                </div>`,
            didOpen: (popup) => {
                let current = type;
                const show = () => {
                    popup.querySelectorAll('[data-section]').forEach(s => { s.style.display = s.dataset.section === current ? 'flex' : 'none'; });
                    popup.querySelectorAll('.cy-tab').forEach(t => t.classList.toggle('active', t.dataset.type === current));
                    popup.querySelector('#cy-notes-label').textContent = current === 'lainnya' ? 'Keterangan Kegiatan' : 'Catatan';
                    popup.dataset.type = current;
                };
                popup.querySelectorAll('.cy-tab').forEach(t => t.addEventListener('click', () => { current = t.dataset.type; show(); }));
                show();
            },
            preConfirm: async () => {
                const popup = Swal.getPopup();
                const val = (id) => popup.querySelector('#' + id).value.trim();
                const activityType = popup.dataset.type;
                const body = {
                    cycle_id: cycle.id,
                    type: activityType,
                    activity_date: val('cy-date'),
                    cost: val('cy-cost'),
                    notes: val('cy-notes'),
                };
                if (activityType === 'pupuk') {
                    Object.assign(body, { fertilizer_name: val('cy-fert-name'), fertilizer_phase: val('cy-fert-phase'), amount: val('cy-amount'), unit: val('cy-unit') });
                    if (!body.fertilizer_name || !(parseFloat(body.amount) > 0)) {
                        Swal.showValidationMessage('Isi jenis pupuk dan jumlahnya');
                        return false;
                    }
                } else if (activityType === 'pengairan') {
                    Object.assign(body, { water_method: val('cy-water-method'), duration_min: val('cy-duration') });
                } else if (activityType === 'observasi') {
                    Object.assign(body, { growth_stage: val('cy-stage'), plant_height_cm: val('cy-height'), condition: val('cy-condition'), pest_disease: val('cy-pest') });
                } else if (!body.notes) {
                    Swal.showValidationMessage('Isi keterangan kegiatan');
                    return false;
                }
                try {
                    return await post('activities.php?action=save', body);
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            },
        });
        if (result.isConfirmed) App.toast(result.value.message, 'success');
        return result.isConfirmed;
    }

    /**
     * Record fertilizing straight from the calculator's dosage rows.
     * presets: [{ nama_pupuk, fase, total, satuan }] from LandEvaluator rekomendasi_pupuk.
     */
    async function openApplyDosage({ cycle, presets, sourceCrop = '' }) {
        injectStyles();
        const mismatch = sourceCrop && App.decodeEntities(sourceCrop).toLowerCase() !== App.decodeEntities(cycle.crop_name).toLowerCase();
        const result = await Swal.fire({
            ...swalTheme,
            title: 'Catat Pemupukan',
            confirmButtonText: 'Simpan Pemupukan',
            html: `
                <div class="cy-form">
                    <div class="cy-hint">Centang pupuk yang sudah diberikan ke ${esc(cycle.crop_name)}. Jumlah terisi dari kalkulator, ubah sesuai pemakaian aktual.</div>
                    ${mismatch ? `<div class="cy-hint" style="color:#f0a282;"><i class="ph ph-warning"></i> Dosis ini untuk ${esc(sourceCrop)}, berbeda dengan tanaman aktif (${esc(cycle.crop_name)}).</div>` : ''}
                    ${presets.map((p, i) => `
                        <label class="cy-dose">
                            <input type="checkbox" data-i="${i}" checked>
                            <span><strong>${esc(p.nama_pupuk)}</strong><br><small class="cy-hint">Fase: ${esc(p.fase)}</small></span>
                            <input type="number" min="0" step="0.01" data-amount="${i}" value="${Math.round((p.total || 0) * 100) / 100}">
                            <small>${esc(p.satuan || 'kg')}</small>
                        </label>`).join('')}
                    <div><label>Tanggal</label><input id="cy-date" type="date" value="${today()}" min="${cycle.planting_date}" max="${today()}"></div>
                    <div><label>Total Biaya Pupuk (Rp, opsional)</label><input id="cy-cost" type="number" min="0" step="1000" placeholder="0"></div>
                </div>`,
            preConfirm: async () => {
                const popup = Swal.getPopup();
                const date = popup.querySelector('#cy-date').value;
                const cost = popup.querySelector('#cy-cost').value;
                const chosen = presets
                    .map((p, i) => ({ p, i, amount: popup.querySelector(`[data-amount="${i}"]`).value }))
                    .filter(({ i, amount }) => popup.querySelector(`[data-i="${i}"]`).checked && parseFloat(amount) > 0);
                if (chosen.length === 0) {
                    Swal.showValidationMessage('Pilih minimal satu pupuk dengan jumlah lebih dari 0');
                    return false;
                }
                try {
                    // Cost is recorded once, on the first row, so totals are not multiplied
                    for (const [n, { p, amount }] of chosen.entries()) {
                        await post('activities.php?action=save', {
                            cycle_id: cycle.id, type: 'pupuk', activity_date: date,
                            fertilizer_name: App.decodeEntities(p.nama_pupuk), fertilizer_phase: App.decodeEntities(p.fase),
                            amount, unit: p.satuan || 'kg', cost: n === 0 ? cost : '',
                        });
                    }
                    return chosen.length;
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            },
        });
        if (result.isConfirmed) App.toast(`${result.value} catatan pemupukan disimpan`, 'success');
        return result.isConfirmed;
    }

    /** Record the harvest; closes the cycle and frees the farm. */
    async function openHarvest({ farm, cycle }) {
        injectStyles();
        const estimate = await estimateYield(cycle.crop_name, parseFloat(cycle.area_ha) || parseFloat(farm.area_ha));
        const result = await Swal.fire({
            ...swalTheme,
            title: 'Catat Hasil Panen',
            confirmButtonText: 'Simpan Panen',
            confirmButtonColor: '#c67b5c',
            html: `
                <div class="cy-form">
                    <div class="cy-hint">${esc(cycle.crop_name)} · ditanam ${App.formatDate(cycle.planting_date)} · ${esc(farm.name)}</div>
                    <div class="cy-row">
                        <div><label>Tanggal Panen</label><input id="cy-date" type="date" value="${today()}" min="${cycle.planting_date}" max="${today()}"></div>
                        <div><label>Hasil Aktual (Ton)</label><input id="cy-actual" type="number" min="0" step="0.01"></div>
                    </div>
                    <div><label>Estimasi (Ton)</label><input id="cy-estimate" type="number" min="0" step="0.01" value="${estimate ?? ''}"></div>
                    <div><label>Catatan (kualitas, harga jual, kendala)</label><textarea id="cy-notes" rows="2" placeholder="Opsional"></textarea></div>
                    <div class="cy-hint">Setelah disimpan, musim tanam ini ditutup dan lahan siap untuk musim berikutnya.</div>
                </div>`,
            preConfirm: async () => {
                const actual = document.getElementById('cy-actual').value;
                if (actual === '' || parseFloat(actual) < 0) {
                    Swal.showValidationMessage('Isi hasil panen aktual');
                    return false;
                }
                try {
                    return await post('harvests.php?action=save', {
                        farm_id: farm.id,
                        cycle_id: cycle.id,
                        harvest_date: document.getElementById('cy-date').value,
                        actual_yield_ton: actual,
                        estimated_yield_ton: document.getElementById('cy-estimate').value,
                        notes: document.getElementById('cy-notes').value.trim(),
                    });
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            },
        });
        if (result.isConfirmed) App.toast(result.value.message, 'success');
        return result.isConfirmed;
    }

    /** Mark the active cycle as failed (gagal panen). */
    async function openFail({ cycle }) {
        injectStyles();
        const result = await Swal.fire({
            ...swalTheme,
            title: 'Tandai Gagal Panen?',
            icon: 'warning',
            confirmButtonText: 'Ya, Tandai Gagal',
            confirmButtonColor: '#c67b5c',
            html: `
                <div class="cy-form">
                    <div class="cy-hint">Musim tanam ${esc(cycle.crop_name)} akan ditutup tanpa hasil panen. Riwayat kegiatan tetap tersimpan.</div>
                    <div><label>Penyebab</label><input id="cy-notes" placeholder="Contoh: serangan wereng, banjir"></div>
                </div>`,
            preConfirm: async () => {
                try {
                    return await post('cycles.php?action=fail', { id: cycle.id, notes: document.getElementById('cy-notes').value.trim() });
                } catch (err) {
                    Swal.showValidationMessage(err.message);
                    return false;
                }
            },
        });
        if (result.isConfirmed) App.toast(result.value.message, 'success');
        return result.isConfirmed;
    }

    return {
        ACTIVITY_META, esc, isoDate, loadCrops, findCropInfo, estimateYield, growth, formatRupiah, formatAmount,
        describeActivity, openStartCycle, openEditCycle, openActivity, openApplyDosage, openHarvest, openFail,
    };
})();
