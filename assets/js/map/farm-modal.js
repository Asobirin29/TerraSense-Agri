// ============================================================
// TerraSense Agri — Farm Modal & Form Controller
// Modal interactions, form pre-population, and API persistence
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.FarmModal = {
    /**
     * Open modal to save new farm.
     */
    openSaveNew({ modalEl, selectedCrop, simSoilTexture, simSlope }) {
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = 'Simpan Lahan Baru';

        document.getElementById('farm-name').value = '';
        document.getElementById('farm-notes').value = '';
        document.getElementById('farm-crop').value = selectedCrop ? selectedCrop.nama_komoditas : '';
        document.getElementById('farm-planting-date').value = new Date().toISOString().split('T')[0];

        const textureEl = document.getElementById('farm-texture');
        if (textureEl && simSoilTexture) textureEl.value = simSoilTexture.value;

        const slopeEl = document.getElementById('farm-slope');
        if (slopeEl && simSlope) slopeEl.value = simSlope.value;

        if (modalEl) {
            modalEl.style.display = 'flex';
            document.getElementById('farm-name').focus();
        }
    },

    /**
     * Open modal to edit existing farm.
     */
    openEdit({ modalEl, currentFarm, selectedCrop, simSoilTexture, simSlope }) {
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = 'Edit Informasi Lahan';

        if (currentFarm) {
            document.getElementById('farm-name').value = currentFarm.name || '';
            document.getElementById('farm-notes').value = currentFarm.notes || '';
            document.getElementById('farm-crop').value = currentFarm.crop_id || (selectedCrop ? selectedCrop.nama_komoditas : '');
            document.getElementById('farm-planting-date').value = currentFarm.planting_date || '';
            document.getElementById('farm-irrigation').value = currentFarm.irrigation_status || 'Tidak Ada Irigasi';

            const textureEl = document.getElementById('farm-texture');
            if (textureEl) textureEl.value = currentFarm.soil_texture || (simSoilTexture ? simSoilTexture.value : 'sedang');

            const slopeEl = document.getElementById('farm-slope');
            if (slopeEl) {
                const s = currentFarm.slope_pct;
                if (s <= 3) slopeEl.value = '2';
                else if (s <= 8) slopeEl.value = '5';
                else if (s <= 16) slopeEl.value = '12';
                else if (s <= 30) slopeEl.value = '20';
                else slopeEl.value = '35';
            }
        }

        if (modalEl) {
            modalEl.style.display = 'flex';
            document.getElementById('farm-name').focus();
        }
    },

    /**
     * Close modal.
     */
    close(modalEl) {
        if (modalEl) modalEl.style.display = 'none';
    },

    /**
     * Submit farm form (save or update).
     */
    async submitForm(e, { isEditing, loadedFarmId, currentGeoJSON, currentAreaHa, currentElevation, currentTemperature, currentRainfall, modalEl, onSaved }) {
        e.preventDefault();
        const submitBtn = document.getElementById('farm-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Menyimpan...';
        }

        const name              = document.getElementById('farm-name').value.trim() || 'Lahan Saya';
        const notes             = document.getElementById('farm-notes').value.trim();
        const crop_id           = document.getElementById('farm-crop').value.trim();
        const planting_date     = document.getElementById('farm-planting-date').value;
        const irrigation_status = document.getElementById('farm-irrigation').value;
        const soil_texture      = document.getElementById('farm-texture') ? document.getElementById('farm-texture').value : 'sedang';
        const slope_pct         = document.getElementById('farm-slope') ? parseFloat(document.getElementById('farm-slope').value) : 5;

        try {
            if (isEditing && loadedFarmId) {
                await App.api(`farms.php?action=update&id=${loadedFarmId}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name, notes, crop_id, planting_date, irrigation_status, soil_texture, slope_pct
                    })
                });
                App.toast('Data lahan berhasil diperbarui!', 'success');
                setTimeout(() => window.location.reload(), 500);
            } else {
                if (!currentGeoJSON) throw new Error('Poligon lahan belum dibuat.');

                const zoneKey = window.TerraSense.EnvService.determineZone(currentElevation);
                const saved = await App.api('farms.php?action=save', {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        geojson: JSON.stringify(currentGeoJSON),
                        area_ha: currentAreaHa,
                        elevation: currentElevation,
                        zone: zoneKey,
                        latitude: currentGeoJSON.geometry.coordinates[0][0][1],
                        longitude: currentGeoJSON.geometry.coordinates[0][0][0],
                        notes,
                        crop_id,
                        planting_date,
                        irrigation_status,
                        soil_texture,
                        slope_pct
                    })
                });

                if (modalEl) modalEl.style.display = 'none';
                App.toast('Lahan berhasil disimpan!', 'success');

                if (typeof onSaved === 'function') {
                    await onSaved(saved.farm_id, slope_pct, soil_texture);
                }

                setTimeout(() => window.location.search = `?id=${saved.farm_id}`, 500);
            }
        } catch (err) {
            console.error(err);
            App.toast(err.message || 'Gagal menyimpan lahan', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Simpan';
            }
        }
    },

    /**
     * Confirm and execute farm deletion.
     */
    async confirmDelete(farmId) {
        const result = await Swal.fire({
            title: 'Hapus Lahan?',
            text: 'Tindakan ini akan menghapus data lahan dan histori evaluasi.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#c67b5c',
            cancelButtonColor: '#192019',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                await App.api('farms.php?action=delete', {
                    method: 'POST',
                    body: JSON.stringify({ id: farmId })
                });
                App.toast('Lahan berhasil dihapus!', 'success');
                setTimeout(() => window.location.href = '/TerraSense-Agri/pages/farm-map.html', 500);
            } catch (err) {
                App.toast('Gagal menghapus lahan', 'error');
            }
        }
    }
};
