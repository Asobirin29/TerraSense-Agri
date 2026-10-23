// ============================================================
// TerraSense Agri — UI Renderer Module
// Pure UI renderers for evaluation cards, animated counters, and metrics
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.UIRenderer = {
    /**
     * Animate numeric change with easing.
     */
    animateNumber(element, target, decimals = 0, duration = 600, suffix = '') {
        if (!element) return;
        const startTime = performance.now();
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            element.innerHTML = `${current.toFixed(decimals)}${suffix}`;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    },

    /**
     * Update filter tab counts.
     */
    updateTabCounts(evaluations, countRefs) {
        const counts = { all: evaluations.length, S1: 0, S2: 0, S3: 0, N: 0 };
        evaluations.forEach(c => {
            if (counts[c.kelas_kesesuaian] !== undefined) counts[c.kelas_kesesuaian]++;
        });

        if (countRefs.all) countRefs.all.textContent = counts.all;
        if (countRefs.S1)  countRefs.S1.textContent  = counts.S1;
        if (countRefs.S2)  countRefs.S2.textContent  = counts.S2;
        if (countRefs.S3)  countRefs.S3.textContent  = counts.S3;
        if (countRefs.N)   countRefs.N.textContent   = counts.N;
    },

    /**
     * Render commodity evaluation cards list.
     */
    renderCardList(evaluations, activeFilter, selectedCrop, containerEl, onSelectCrop) {
        if (!containerEl) return;

        const filtered = activeFilter === 'all'
            ? evaluations
            : evaluations.filter(c => c.kelas_kesesuaian === activeFilter);

        if (filtered.length === 0) {
            containerEl.innerHTML = `
                <div style="padding:24px 0;text-align:center;color:var(--bark-muted);font-size:0.75rem;font-style:italic;">
                    Tidak ada komoditas dalam kategori ${activeFilter}.
                </div>`;
            return;
        }

        let html = '';
        filtered.forEach(crop => {
            const badgeClass = `badge-${crop.kelas_kesesuaian.toLowerCase()}`;
            const isSelected = selectedCrop && selectedCrop.id_komoditas === crop.id_komoditas;

            html += `
                <div class="eval-card ${isSelected ? 'selected' : ''}" data-id="${crop.id_komoditas}">
                    <div class="eval-card-header">
                        <div class="eval-card-crop">
                            <span class="eval-card-icon">${crop.icon || '🌱'}</span>
                            <div>
                                <div class="eval-card-name">${crop.nama_komoditas}</div>
                                <div class="eval-card-latin">${crop.nama_latin || crop.kelompok}</div>
                            </div>
                        </div>
                        <div class="eval-badges">
                            <span class="eval-class-badge ${badgeClass}">${crop.kelas_kesesuaian} · ${crop.nama_kelas}</span>
                            <span class="eval-subkelas-badge">Subkelas: ${crop.subkelas || crop.kelas_kesesuaian}</span>
                        </div>
                    </div>

                    ${crop.faktor_pembatas && crop.faktor_pembatas.length > 0 ? `
                        <div class="lim-factor-box">
                            <i class="ph-fill ph-warning"></i>
                            <div><strong>Faktor Pembatas:</strong> ${crop.faktor_pembatas.join(', ')}</div>
                        </div>` : ''}

                    ${crop.faktor_sekunder && crop.faktor_sekunder.length > 0 ? `
                        <div class="sec-factor-box">
                            <i class="ph ph-info"></i> Pembatas Sekunder: ${crop.faktor_sekunder.join(', ')}
                        </div>` : ''}

                    <div class="param-pills">
                        ${(crop.detail_parameter || []).map(p => `
                            <span class="param-pill pill-${p.kelas.toLowerCase()}" title="${p.label}: Nilai ${p.nilai} (${p.kelas})">
                                ${p.label}: <strong>${p.kelas}</strong>
                            </span>`).join('')}
                    </div>

                    <button class="btn-select-crop" type="button" data-select-id="${crop.id_komoditas}">
                        <i class="ph-bold ph-drop"></i> Terapkan Dosis Pupuk
                    </button>
                </div>`;
        });

        containerEl.innerHTML = html;

        // Card click handler
        containerEl.querySelectorAll('.eval-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                const crop = evaluations.find(c => c.id_komoditas === id);
                if (crop && typeof onSelectCrop === 'function') onSelectCrop(crop, false);
            });
        });

        // "Terapkan Dosis Pupuk" button click handler
        containerEl.querySelectorAll('.btn-select-crop').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.selectId);
                const crop = evaluations.find(c => c.id_komoditas === id);
                if (crop && typeof onSelectCrop === 'function') onSelectCrop(crop, true);
            });
        });
    },

    /**
     * Render loading indicator in recommendation container.
     */
    renderLoading(containerEl) {
        if (!containerEl) return;
        containerEl.innerHTML = `
            <div style="padding:28px 0;text-align:center;color:var(--bark-dim);">
                <div style="font-size:24px;margin-bottom:8px;animation:spin 1s linear infinite;">⏳</div>
                <div style="font-size:0.8rem;font-weight:600;">Mengevaluasi Lahan...</div>
                <div style="font-size:0.68rem;color:var(--bark-muted);margin-top:2px;">Menerapkan Hukum Minimum Balittanah 2003</div>
            </div>`;
    },

    /**
     * Render error message in recommendation container.
     */
    renderError(containerEl, msg) {
        if (!containerEl) return;
        containerEl.innerHTML = `
            <div style="padding:20px 0;text-align:center;color:var(--terracotta);font-size:0.75rem;">
                ${msg || 'Gagal memuat evaluasi. Pastikan data komoditas telah di-seed (php api/seed.php).'}
            </div>`;
    },

    /**
     * Render the planting cycle (musim tanam) widget of a saved farm:
     * growth phase from the cycle's own harvest age, last fertilizing, yield estimate,
     * or a "Mulai Tanam" prompt when the farm has no active cycle.
     */
    async renderGrowthMonitoring(farm) {
        const { CycleUI } = window.TerraSense;
        const section = document.getElementById('growth-monitoring-section');
        const emptySection = document.getElementById('no-cycle-section');
        const historyLink = document.getElementById('link-farm-history');
        if (!section) return;

        if (historyLink) {
            historyLink.href = `/TerraSense-Agri/pages/farm-detail.html?id=${encodeURIComponent(farm.id)}`;
            historyLink.style.display = 'flex';
        }

        const cycle = farm.active_cycle;
        section.style.display = cycle ? 'block' : 'none';
        if (emptySection) emptySection.style.display = cycle ? 'none' : 'block';
        if (!cycle) return;

        const g = CycleUI.growth(cycle);
        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

        setText('res-growth-stage', g.stage);
        setText('res-growth-days-elapsed', `Hari ke-${g.days}`);
        setText('res-growth-days-total', `${g.total} Hari`);
        setText('res-cycle-crop', App.decodeEntities(cycle.crop_name));
        const bar = document.getElementById('res-growth-bar');
        if (bar) bar.style.width = `${g.percent}%`;

        const summary = cycle.summary || {};
        const last = summary.last_fertilizing;
        setText('res-last-fertilizing', last
            ? `Terakhir: ${App.decodeEntities(last.fertilizer_name)} ${CycleUI.formatAmount(last.amount)} ${last.unit} · ${App.timeAgo(last.activity_date + 'T00:00:00')}`
            : 'Belum ada catatan pemupukan');
        setText('res-fert-totals', (summary.fertilizers || []).length
            ? 'Total musim ini: ' + summary.fertilizers.map(f => `${App.decodeEntities(f.name)} ${CycleUI.formatAmount(f.total)} ${f.unit}`).join(', ')
            : '');

        const estimate = await CycleUI.estimateYield(cycle.crop_name, parseFloat(cycle.area_ha) || parseFloat(farm.area_ha));
        setText('res-est-yield-value', estimate !== null ? `${estimate.toLocaleString('id-ID')} Ton` : '- Ton');
    }
};
