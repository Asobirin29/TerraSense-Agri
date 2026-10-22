// ============================================================
// TerraSense Agri — Farm GIS & Mapping Module
// Leaflet, ESRI Imagery, Leaflet.Draw, Turf.js spatial operations
// ============================================================

window.TerraSense = window.TerraSense || {};

window.TerraSense.FarmGIS = {
    /**
     * Initialize Leaflet map with ESRI satellite and boundary layers.
     * @param {string} containerId - DOM ID of map container
     * @param {Array<number>} center - [lat, lon]
     * @param {number} zoom - initial zoom level
     */
    initMap(containerId = 'map', center = [-6.8500, 107.9167], zoom = 13) {
        const map = L.map(containerId, {
            zoomControl: false,
            attributionControl: false,
        }).setView(center, zoom);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri World Imagery',
            maxZoom: 19,
            maxNativeZoom: 18,
        }).addTo(map);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            opacity: 0.45,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const polygonDrawer = new L.Draw.Polygon(map, {
            allowIntersection: false,
            drawError: {
                color: '#BF4545',
                message: '<strong>Error:</strong> Batas poligon tidak boleh bersilangan!',
            },
            shapeOptions: {
                color: '#7ab880',
                weight: 3,
                fillColor: '#5a8a60',
                fillOpacity: 0.2,
            },
        });

        return { map, drawnItems, polygonDrawer };
    },

    /**
     * Compute polygon centroid [lat, lon] and area in hectares using Turf.js.
     * @param {L.Layer} layer - Leaflet layer from draw or geojson
     */
    extractPolygonMetrics(layer) {
        const geoJson = layer.toGeoJSON();
        const feature = geoJson.features ? geoJson.features[0] : geoJson;

        if (!feature || !feature.geometry || feature.geometry.type !== 'Polygon') {
            throw new Error('Bentuk poligon tidak valid. Minimal 3 titik.');
        }

        const centroid = turf.centroid(feature);
        const [cLon, cLat] = centroid.geometry.coordinates;
        const areaHa = turf.area(feature) / 10000;

        if (areaHa <= 0) {
            throw new Error('Luas lahan terdeteksi 0.');
        }

        return {
            feature,
            centroid: { lat: cLat, lon: cLon },
            areaHa,
        };
    },

    /**
     * Render existing farm GeoJSON onto the map.
     */
    renderExistingPolygon(map, drawnItems, geojson) {
        const parsed = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
        const layer = L.geoJSON(parsed, {
            style: { color: '#7ab880', weight: 3, fillColor: '#5a8a60', fillOpacity: 0.2 },
        });

        drawnItems.clearLayers();
        layer.eachLayer(l => drawnItems.addLayer(l));
        map.fitBounds(layer.getBounds(), { padding: [50, 50] });

        return drawnItems.getLayers()[0];
    }
};
