// ============================================================
// TerraSense Agri — Environmental & Weather Service
// Integration with Open-Meteo APIs (Elevation & Weather Forecast)
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.EnvService = {
    /**
     * Determine ecological zone by elevation.
     */
    determineZone(elevation) {
        if (elevation > 800) return 'highland';
        if (elevation >= 400) return 'midland';
        return 'lowland';
    },

    /**
     * Human-readable label for elevation zone.
     */
    getZoneLabel(elevation) {
        if (elevation > 800) return 'Dataran Tinggi (> 800 MDPL)';
        if (elevation >= 400) return 'Dataran Sedang (400 - 800 MDPL)';
        return 'Dataran Rendah (< 400 MDPL)';
    },

    /**
     * Fetch terrain elevation from Open-Meteo Elevation API.
     */
    async fetchElevation(lat, lon) {
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
            if (!res.ok) throw new Error('Elevasi gagal');
            const data = await res.json();
            return data.elevation ? data.elevation[0] : null;
        } catch (e) {
            console.warn('Elevation unavailable:', e);
            return null;
        }
    },

    /**
     * Fetch live micro-climate weather from Open-Meteo Forecast API.
     */
    async fetchWeather(lat, lon) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia/Jakarta`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Cuaca gagal');
            const data = await res.json();
            if (!data.current) throw new Error('Cuaca kosong');
            return {
                temperature: data.current.temperature_2m,
                humidity: data.current.relative_humidity_2m,
                precipitation: data.current.precipitation,
            };
        } catch (e) {
            console.warn('Weather unavailable:', e);
            return null;
        }
    },

    /**
     * Annual climate from the Open-Meteo Archive API (last 365 days).
     * Syarat tumbuh Balittanah memakai suhu rata-rata tahunan & curah hujan tahunan,
     * bukan cuaca saat ini. Returns null fields when data is unavailable, so the
     * parameter is skipped by the evaluator instead of being guessed.
     */
    async fetchAnnualClimate(lat, lon) {
        const fmt = d => d.toISOString().slice(0, 10);
        const end = new Date();
        end.setDate(end.getDate() - 7); // archive data lags a few days
        const start = new Date(end);
        start.setDate(start.getDate() - 364);

        try {
            const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&daily=temperature_2m_mean,precipitation_sum&timezone=Asia/Jakarta`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Iklim tahunan gagal');
            const data = await res.json();
            const temps = (data.daily?.temperature_2m_mean || []).filter(v => v !== null);
            const rains = (data.daily?.precipitation_sum || []).filter(v => v !== null);
            return {
                meanTemperature: temps.length >= 300 ? temps.reduce((s, v) => s + v, 0) / temps.length : null,
                annualRainfall: rains.length >= 300 ? Math.round(rains.reduce((s, v) => s + v, 0) * 365 / rains.length) : null,
            };
        } catch (e) {
            console.warn('Annual climate unavailable; rainfall will not be evaluated:', e);
            return { meanTemperature: null, annualRainfall: null };
        }
    }
};
