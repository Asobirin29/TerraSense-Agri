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
            return data.elevation ? data.elevation[0] : 600;
        } catch (e) {
            console.warn('Fallback elevation used (600 MDPL):', e);
            return 600;
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
            return {
                temperature: data.current ? data.current.temperature_2m : 25,
                humidity: data.current ? data.current.relative_humidity_2m : 80,
                precipitation: data.current ? data.current.precipitation : 0,
            };
        } catch (e) {
            console.warn('Fallback weather used:', e);
            return { temperature: 25.0, humidity: 80, precipitation: 0 };
        }
    },

    /**
     * Estimate regional annual rainfall (e.g. Sumedang regency gradient).
     */
    estimateRainfall(elevation) {
        return Math.round(1800 + Math.min(800, Math.max(0, (elevation / 1000) * 800)));
    }
};
