// ============================================================
// TerraSense Agri — Precision Fertilizer Calculator
// Calculates and renders dosage per hectare scaled to real polygon area
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.FertilizerCalc = {
    /**
     * Render fertilizer dosage table and badges for the selected commodity.
     * @param {Object} crop - Commodity evaluation object
     * @param {number} areaHa - Farm area in hectares
     * @param {Object} domElements
     * @param {HTMLElement} domElements.container - Container for dosage items
     * @param {HTMLElement} [domElements.cropLabel] - Crop name label
     * @param {HTMLElement} [domElements.areaLabel] - Area label
     * @param {HTMLElement} [domElements.badgeSelected] - Badge element for class
     */
    renderDosage(crop, areaHa, { container, cropLabel, areaLabel, badgeSelected }) {
        if (!crop || !container) return;

        if (cropLabel) cropLabel.textContent = crop.nama_komoditas;
        if (areaLabel) areaLabel.textContent = areaHa.toFixed(2);

        if (badgeSelected) {
            badgeSelected.style.display = 'inline-block';
            badgeSelected.textContent = `${crop.kelas_kesesuaian} · ${crop.nama_kelas}`;

            const badgeStyles = {
                S1: { bg: 'rgba(90,138,96,0.2)', text: '#8fd496' },
                S2: { bg: 'rgba(234,179,8,0.2)', text: '#fde047' },
                S3: { bg: 'rgba(198,123,92,0.2)', text: '#f0a282' },
                N:  { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
            };
            const style = badgeStyles[crop.kelas_kesesuaian] || badgeStyles.N;
            badgeSelected.style.background = style.bg;
            badgeSelected.style.color = style.text;
        }

        // Highlight selected card in card list
        document.querySelectorAll('.eval-card').forEach(card => {
            if (card.dataset.id == crop.id_komoditas) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        if (!crop.rekomendasi_pupuk || crop.rekomendasi_pupuk.length === 0) {
            container.innerHTML = `
                <div style="padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.05);text-align:center;">
                    <p style="font-size:0.75rem;color:var(--bark-dim);">Tidak ada rekomendasi pemupukan standar untuk kelas <strong>${crop.kelas_kesesuaian} (${crop.nama_kelas})</strong>.</p>
                </div>`;
            return;
        }

        let html = '';
        crop.rekomendasi_pupuk.forEach(p => {
            html += `
                <div class="dose-item" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <div style="display:flex;flex-direction:column;gap:2px;">
                        <span style="color:var(--bark);font-size:0.8rem;font-weight:600;">${p.nama_pupuk}</span>
                        <span style="color:var(--bark-muted);font-size:0.68rem;text-transform:capitalize;">Fase: ${p.fase} · ${p.dosis_per_ha.toLocaleString('id-ID')} ${p.satuan}/Ha</span>
                        ${p.catatan ? `<span style="color:var(--bark-dim);font-size:0.65rem;font-style:italic;">${p.catatan}</span>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <span style="font-family:'DM Serif Display',serif;font-size:1.15rem;color:var(--sage-light);line-height:1;">${p.total < 10 ? p.total.toFixed(1) : Math.round(p.total).toLocaleString('id-ID')}</span>
                        <span style="font-size:0.7rem;color:var(--terracotta);font-weight:600;margin-left:2px;">${p.satuan}</span>
                    </div>
                </div>`;
        });

        container.innerHTML = html;
    }
};
