// ============================================================
// TerraSense Agri — Land Evaluation API Service
// Communicates with api/evaluate.php (Balittanah 2003 Engine)
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.EvalService = {
    /**
     * Call backend API to evaluate land suitability.
     * @param {Object} params
     * @param {number} params.areaHa
     * @param {number} params.elevation
     * @param {number} params.temperature
     * @param {number} params.rainfall
     * @param {number} params.slope
     * @param {string} params.texture
     * @param {number|null} [params.farmId]
     */
    async evaluateLandSuitability({ areaHa, elevation, temperature, rainfall, slope, texture, farmId = null }) {
        if (!areaHa || areaHa <= 0) return null;

        const payload = {
            area_ha: parseFloat(areaHa.toFixed(2)),
            elevation: Math.round(elevation),
            temperature: parseFloat(temperature.toFixed(1)),
            slope: parseFloat(slope),
            texture: texture,
        };
        // Unknown rainfall is omitted so the evaluator skips it instead of judging a guess
        if (rainfall !== null && rainfall !== undefined) payload.rainfall = Math.round(rainfall);

        if (farmId) payload.farm_id = farmId;

        try {
            const data = await App.api('evaluate.php', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            return data;
        } catch (err) {
            console.error('Error in evaluateLandSuitability:', err);
            App.toast('Gagal melakukan evaluasi kesesuaian lahan: ' + (err.message || 'Server error'), 'error');
            return null;
        }
    }
};
