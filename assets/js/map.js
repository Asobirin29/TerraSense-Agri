// ============================================================
// TerraSense Agri — Precision Farm Map Orchestrator
// Coordinates GIS, Environmental Services, Balittanah Evaluation,
// Precision Fertilizer Calculator, and Farm Management Modals.
// ============================================================

window.initMap = async function () {
    // 1. AUTH CHECK
    const currentUser = await App.checkAuth();
    if (!currentUser) return;

    const { EnvService, EvalService, FertilizerCalc, UIRenderer, FarmGIS, FarmModal } = window.TerraSense;

    // 2. GIS INITIALIZATION
    const sumedangCoords = [-6.8500, 107.9167];
    const { map, drawnItems, polygonDrawer } = FarmGIS.initMap('map', sumedangCoords, 13);
    window.map = map; // Expose for sidebar resize

    // 3. DOM ELEMENT REFERENCES
    const drawBtn           = document.getElementById('draw-btn');
    const locateBtn         = document.getElementById('locate-btn');
    const saveFarmBtn       = document.getElementById('save-farm-btn');
    const editFarmBtn       = document.getElementById('edit-farm-btn');
    const resetBtn          = document.getElementById('reset-btn');
    const resAreaVal        = document.getElementById('res-area-value');
    const resZoneType       = document.getElementById('res-zone-type');
    const resElevationVal   = document.getElementById('res-elevation-val');
    const resTempVal        = document.getElementById('res-temp-val');
    const resRainVal        = document.getElementById('res-rain-val');
    const resSoilType       = document.getElementById('res-soil-type');
    const resSoilNote       = document.getElementById('res-soil-note');
    const envDataSection    = document.getElementById('env-data-section');
    const noFarmMsg         = document.getElementById('no-farm-msg');
    const simSoilTexture    = document.getElementById('sim-soil-texture');
    const simSlope          = document.getElementById('sim-slope');
    const dosageContainer   = document.getElementById('dosage-container');
    const calcAreaLabel     = document.getElementById('calc-area-label');
    const calcCropLabel     = document.getElementById('calc-crop-label');
    const badgeEvalSelected = document.getElementById('badge-eval-selected');
    const recList           = document.getElementById('recommendation-list');
    const farmModal         = document.getElementById('farm-modal');
    const farmForm          = document.getElementById('farm-form');
    const farmCancel        = document.getElementById('farm-cancel');

    const countRefs = {
        all: document.getElementById('count-all'),
        S1:  document.getElementById('count-s1'),
        S2:  document.getElementById('count-s2'),
        S3:  document.getElementById('count-s3'),
        N:   document.getElementById('count-n'),
    };

    // 4. APPLICATION STATE
    let currentAreaHa      = 0;
    let currentElevation   = 600;
    let currentTemperature = null;
    let currentRainfall    = null;
    let currentGeoJSON     = null;
    let currentEvaluations = [];
    let selectedCrop       = null;
    let loadedFarmId       = null;
    let currentLoadedFarm  = null;
    let activeFilter       = 'all';
    let userMarker         = null;
    let isEditingFarm      = false;

    // 5. EVALUATION PIPELINE
    async function runEvaluation(areaHa, elevation, temperature, rainfall, slope, texture, farmId = null) {
        if (!areaHa || areaHa <= 0) return;

        // Animate metrics in Left Panel
        if (resAreaVal) UIRenderer.animateNumber(resAreaVal, areaHa, 2, 500, ' <span>Ha</span>');
        if (resZoneType) resZoneType.textContent = EnvService.getZoneLabel(elevation);
        if (resElevationVal) resElevationVal.textContent = `${Math.round(elevation)} MDPL`;
        if (resTempVal) resTempVal.textContent = `${temperature.toFixed(1)} °C`;
        if (resRainVal) resRainVal.textContent = rainfall !== null ? `${Math.round(rainfall).toLocaleString('id-ID')} mm/thn` : 'Tidak tersedia';
        if (calcAreaLabel) calcAreaLabel.textContent = areaHa.toFixed(2);

        if (envDataSection) envDataSection.style.display = 'block';
        if (noFarmMsg) noFarmMsg.style.display = 'none';

        UIRenderer.renderLoading(recList);

        const data = await EvalService.evaluateLandSuitability({
            areaHa, elevation, temperature, rainfall, slope, texture, farmId
        });

        if (data && data.success) {
            if (resSoilType && data.regional_assumptions) {
                resSoilType.textContent = data.regional_assumptions.soil_type;
            }
            if (resSoilNote && data.regional_assumptions) {
                resSoilNote.style.display = 'block';
                resSoilNote.innerHTML = `<strong>Catatan Regional:</strong> ${data.regional_assumptions.note}`;
            }

            currentEvaluations = data.evaluations || [];
            UIRenderer.updateTabCounts(currentEvaluations, countRefs);

            // Render cards with select callback
            renderCards();

            // Auto-select crop (farm current crop or top evaluated S1 crop)
            let autoCrop = null;
            if (currentLoadedFarm && currentLoadedFarm.crop_id) {
                autoCrop = currentEvaluations.find(c =>
                    c.nama_komoditas.toLowerCase() === currentLoadedFarm.crop_id.toLowerCase() ||
                    c.id_komoditas == currentLoadedFarm.crop_id
                );
            }
            if (!autoCrop && currentEvaluations.length > 0) {
                autoCrop = currentEvaluations[0];
            }
            if (autoCrop) {
                selectCrop(autoCrop, false);
            }
        } else {
            UIRenderer.renderError(recList);
        }
    }

    function renderCards() {
        UIRenderer.renderCardList(
            currentEvaluations,
            activeFilter,
            selectedCrop,
            recList,
            (crop, applyToInput) => selectCrop(crop, applyToInput)
        );
    }

    function selectCrop(crop, applyToInput = false) {
        selectedCrop = crop;
        FertilizerCalc.renderDosage(crop, currentAreaHa, {
            container: dosageContainer,
            cropLabel: calcCropLabel,
            areaLabel: calcAreaLabel,
            badgeSelected: badgeEvalSelected,
        });

        if (applyToInput) {
            const cropInput = document.getElementById('farm-crop');
            if (cropInput) cropInput.value = crop.nama_komoditas;
            App.toast(`Dosis pupuk ${crop.nama_komoditas} diterapkan!`, 'info');
        }
    }

    // 6. ANALYZE POLYGON
    async function analyzePolygon(layer) {
        try {
            const { feature, centroid, areaHa } = FarmGIS.extractPolygonMetrics(layer);
            currentGeoJSON = feature;
            currentAreaHa = areaHa;

            const [elevation, weather, climate] = await Promise.all([
                EnvService.fetchElevation(centroid.lat, centroid.lon),
                EnvService.fetchWeather(centroid.lat, centroid.lon),
                EnvService.fetchAnnualClimate(centroid.lat, centroid.lon),
            ]);

            // Without elevation or any temperature the evaluation would be guesswork
            const temperature = climate.meanTemperature ?? weather?.temperature ?? null;
            if (elevation === null || temperature === null) {
                throw new Error('Data elevasi/iklim dari Open-Meteo tidak tersedia. Periksa koneksi internet lalu coba lagi.');
            }

            currentElevation   = elevation;
            currentTemperature = temperature;
            currentRainfall    = climate.annualRainfall; // null = curah hujan tidak dievaluasi

            const slope   = parseFloat(simSlope ? simSlope.value : 5);
            const texture = simSoilTexture ? simSoilTexture.value : 'sedang';

            await runEvaluation(currentAreaHa, currentElevation, currentTemperature, currentRainfall, slope, texture, loadedFarmId);

            if (resetBtn) resetBtn.classList.remove('hidden');
            if (!loadedFarmId && saveFarmBtn) saveFarmBtn.classList.remove('hidden');
            if (loadedFarmId && editFarmBtn) editFarmBtn.classList.remove('hidden');
            if (drawBtn) drawBtn.classList.remove('active');
        } catch (err) {
            console.error('Error analyzing polygon:', err);
            App.toast(err.message || 'Gagal menganalisis lahan', 'error');
        }
    }

    // 7. SOIL & SLOPE SIMULATOR
    function triggerSimReevaluation() {
        if (currentAreaHa > 0) {
            const slope   = parseFloat(simSlope ? simSlope.value : 5);
            const texture = simSoilTexture ? simSoilTexture.value : 'sedang';
            runEvaluation(currentAreaHa, currentElevation, currentTemperature, currentRainfall, slope, texture, loadedFarmId);
        }
    }

    if (simSoilTexture) {
        simSoilTexture.addEventListener('change', () => {
            triggerSimReevaluation();
            App.toast(`Simulasi diperbarui: Tekstur ${simSoilTexture.value}`, 'info');
        });
    }

    if (simSlope) {
        simSlope.addEventListener('change', () => {
            triggerSimReevaluation();
            App.toast(`Simulasi diperbarui: Lereng ${simSlope.value}%`, 'info');
        });
    }

    // 8. MAP DRAWING & GEOLOCATION CONTROLS
    if (drawBtn) {
        drawBtn.addEventListener('click', (e) => {
            e.preventDefault();
            polygonDrawer.enable();
            drawBtn.classList.add('active');
            App.toast('Klik pada peta untuk membuat titik batas lahan.', 'info');
        });
    }

    if (locateBtn) {
        locateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            locateBtn.classList.add('active');
            map.locate({ setView: true, maxZoom: 16 });
        });
    }

    map.on('locationfound', function(e) {
        if (locateBtn) locateBtn.classList.remove('active');
        if (!userMarker) {
            userMarker = L.circleMarker(e.latlng, {
                radius: 8,
                fillColor: "#5a8a60",
                color: "#f0e8d8",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(map);
        } else {
            userMarker.setLatLng(e.latlng);
        }
        App.toast('Lokasi terdeteksi!', 'success');
    });

    map.on('locationerror', function() {
        if (locateBtn) locateBtn.classList.remove('active');
        App.toast('Gagal mendapatkan lokasi GPS.', 'error');
    });

    map.on(L.Draw.Event.CREATED, function (event) {
        drawnItems.clearLayers();
        drawnItems.addLayer(event.layer);
        polygonDrawer.disable();
        if (drawBtn) drawBtn.classList.remove('active');
        loadedFarmId = null;
        analyzePolygon(event.layer);
    });

    map.on('draw:drawstop', function () {
        if (drawBtn) drawBtn.classList.remove('active');
    });

    // 9. FILTER TABS
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            renderCards();
        });
    });

    // 10. RESET / DELETE FARM
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (loadedFarmId) {
                await FarmModal.confirmDelete(loadedFarmId);
                return;
            }

            drawnItems.clearLayers();
            currentGeoJSON = null;
            currentAreaHa = 0;
            currentEvaluations = [];
            selectedCrop = null;

            if (resAreaVal) resAreaVal.innerHTML = '0.00 <span>Ha</span>';
            if (resZoneType) resZoneType.textContent = '-';
            if (envDataSection) envDataSection.style.display = 'none';
            if (noFarmMsg) noFarmMsg.style.display = 'block';
            if (dosageContainer) dosageContainer.innerHTML = '<p style="font-size:0.75rem;color:var(--bark-muted);font-style:italic;">Belum ada kalkulasi.</p>';
            if (recList) recList.innerHTML = '<p style="font-size:0.75rem;color:var(--bark-muted);font-style:italic;text-align:center;padding:20px 0;">Menunggu data lahan...</p>';
            if (resetBtn) resetBtn.classList.add('hidden');
            if (saveFarmBtn) saveFarmBtn.classList.add('hidden');
            if (editFarmBtn) editFarmBtn.classList.add('hidden');
            if (badgeEvalSelected) badgeEvalSelected.style.display = 'none';
        });
    }

    // 11. LOAD EXISTING FARM
    async function loadExistingFarm(id) {
        try {
            const data = await App.api(`farms.php?id=${id}`);
            const farm = data.farm;
            if (!farm) throw new Error('Data lahan tidak ditemukan');

            currentLoadedFarm = farm;
            loadedFarmId = farm.id;

            // Sync simulator controls
            if (farm.soil_texture && simSoilTexture) simSoilTexture.value = farm.soil_texture;
            if (farm.slope_pct !== null && farm.slope_pct !== undefined && simSlope) {
                const s = parseFloat(farm.slope_pct);
                if (s <= 3) simSlope.value = '2';
                else if (s <= 8) simSlope.value = '5';
                else if (s <= 16) simSlope.value = '12';
                else if (s <= 30) simSlope.value = '20';
                else simSlope.value = '35';
            }

            // Growth monitoring section
            UIRenderer.renderGrowthMonitoring(farm);

            // Render polygon on map and analyze
            const firstLayer = FarmGIS.renderExistingPolygon(map, drawnItems, farm.geojson);
            if (firstLayer) {
                await analyzePolygon(firstLayer);
            }

            if (saveFarmBtn) saveFarmBtn.classList.add('hidden');
            if (editFarmBtn) editFarmBtn.classList.remove('hidden');
            if (resetBtn) resetBtn.classList.remove('hidden');
        } catch (err) {
            console.error('Error loading farm:', err);
            App.toast('Gagal memuat lahan: ' + (err.message || 'Error'), 'error');
        }
    }

    // 12. SAVE & EDIT FARM MODALS
    if (saveFarmBtn) {
        saveFarmBtn.addEventListener('click', () => {
            isEditingFarm = false;
            FarmModal.openSaveNew({
                modalEl: farmModal,
                selectedCrop,
                simSoilTexture,
                simSlope
            });
        });
    }

    if (editFarmBtn) {
        editFarmBtn.addEventListener('click', () => {
            isEditingFarm = true;
            FarmModal.openEdit({
                modalEl: farmModal,
                currentFarm: currentLoadedFarm,
                selectedCrop,
                simSoilTexture,
                simSlope
            });
        });
    }

    if (farmCancel && farmModal) {
        farmCancel.addEventListener('click', () => FarmModal.close(farmModal));
    }

    if (farmForm) {
        farmForm.addEventListener('submit', (e) => {
            FarmModal.submitForm(e, {
                isEditing: isEditingFarm,
                loadedFarmId,
                currentGeoJSON,
                currentAreaHa,
                currentElevation,
                currentTemperature,
                currentRainfall,
                modalEl: farmModal,
                onSaved: async (farmId, slopePct, soilTexture) => {
                    loadedFarmId = farmId;
                    await EvalService.evaluateLandSuitability({
                        areaHa: currentAreaHa,
                        elevation: currentElevation,
                        temperature: currentTemperature,
                        rainfall: currentRainfall,
                        slope: slopePct,
                        texture: soilTexture,
                        farmId
                    });
                }
            });
        });
    }

    // 13. URL PARAMETERS (?id=X or ?draw=true)
    const urlParams   = new URLSearchParams(window.location.search);
    const queryFarmId = urlParams.get('id');
    const triggerDraw = urlParams.get('draw');

    if (queryFarmId) {
        await loadExistingFarm(parseInt(queryFarmId));
    } else if (triggerDraw === 'true') {
        setTimeout(() => { if (drawBtn) drawBtn.click(); }, 500);
    }
};