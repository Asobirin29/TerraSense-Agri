
    window.initMap = async function () {
        // ============================================================
        // AUTH CHECK
        // ============================================================
        const currentUser = await App.checkAuth();
        if (!currentUser) return;

        // ============================================================
        // RECOMMENDATION DATA
        // ============================================================
        const RECOMMENDATION_DATA = {
            highland: {
                name: "Dataran Tinggi",
                elevationRange: "> 800 MDPL",
                description: "Suhu sejuk (<22┬░C), curah hujan tinggi, tanah Andosol vulkanik ΓÇö zona ideal untuk tanaman dataran tinggi bernilai ekonomi premium seperti kopi arabika dan sayuran.",
                colorClass: "zone-highland",
                plants: [
                    { name: "Kopi Arabika", icon: "ph-fill ph-coffee", desc: "Kualitas premium, butuh ketinggian >800m & suhu sejuk" },
                    { name: "Teh", icon: "ph-fill ph-leaf", desc: "Daun berkualitas tinggi, butuh kelembapan & kabut" },
                    { name: "Sayuran (Kubis, Wortel, Kentang)", icon: "ph-fill ph-carrot", desc: "Harga stabil, permintaan pasar tinggi sepanjang tahun" }
                ],
                fertilizers: [
                    "Pupuk Organik/Kandang sebagai pupuk dasar ΓÇö dosis melimpah untuk menjaga kesuburan tanah Andosol",
                    "NPK (15-15-15) untuk nutrisi seimbang pada fase vegetatif",
                    "Pupuk Daun (Foliar) untuk menjaga tanaman dari stress kelembapan tinggi & kabut pegunungan"
                ],
                dosagePerHa: [
                    { name: "Pupuk Organik/Kandang", amount: 5000, unit: "kg", color: "#7C9473", icon: "<i class='ph-fill ph-plant'></i>" },
                    { name: "NPK 15-15-15", amount: 300, unit: "kg", color: "#5B7553", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "Pupuk Susulan (Urea)", amount: 150, unit: "kg", color: "#C67B5C", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "Kapur Dolomit", amount: 1000, unit: "kg", color: "#A0522D", icon: "<i class='ph-fill ph-mountains'></i>" }
                ],
                warnings: ["Jaga drainase baik agar akar tidak busuk akibat kelembapan tinggi", "Aplikasi fungisida preventif untuk cegah penyakit daun akibat kabut"],
                additionalInfo: "Tanaman dataran tinggi perlu proteksi dari kabut pegunungan, suhu rendah malam hari, dan angin kencang. Mulsa tebal sangat disarankan."
            },
            midland: {
                name: "Dataran Sedang",
                elevationRange: "400ΓÇô800 MDPL",
                description: "Suhu sedang (22ΓÇô26┬░C), kontur perbukitan, tanah transisi ΓÇö zona ideal untuk komoditas unggulan Sumedang: Ubi Cilembu yang terkenal bergetah madu.",
                colorClass: "zone-midland",
                plants: [
                    { name: "Ubi Cilembu", icon: "ph-fill ph-potato", desc: "Komoditas UNGGULAN Sumedang, rasa manis madu legendaris" },
                    { name: "Kopi Robusta", icon: "ph-fill ph-coffee", desc: "Lebih toleran & adaptif di elevasi menengah" },
                    { name: "Jagung Hibrida", icon: "ph-fill ph-corn", desc: "Varietas unggul, produktivitas dan ketahanan tinggi" }
                ],
                fertilizers: [
                    "KCl (Kalium Klorida) ΓÇö FOKUS UTAMA pada fase generatif agar getah madu Ubi Cilembu keluar maksimal & umbi besar",
                    "Pupuk Organik sebagai basal untuk memperbaiki struktur tanah",
                    "SP-36 (Fosfor) untuk pembentukan umbi dan perakaran kuat"
                ],
                dosagePerHa: [
                    { name: "Urea (Nitrogen)", amount: 200, unit: "kg", color: "#C67B5C", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "KCl (Kalium Klorida)", amount: 200, unit: "kg", color: "#7C9473", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "Pupuk Organik", amount: 3000, unit: "kg", color: "#5B7553", icon: "<i class='ph-fill ph-plant'></i>" },
                    { name: "Fosfat (SP-36)", amount: 150, unit: "kg", color: "#A0522D", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "Urea (DOSIS RENDAH!)", amount: 75, unit: "kg", color: "#D4845A", icon: "<i class='ph-fill ph-warning'></i>" }
                ],
                warnings: ["Γ¢ö Nitrogen/Urea berlebih DILARANG ΓÇö hanya menyuburkan daun, bukan umbi!", "Kalium tinggi WAJIB agar getah madu Ubi Cilembu keluar maksimal."],
                additionalInfo: "Ubi Cilembu membutuhkan Kalium tinggi (KCl) agar madu/getah keluar sempurna. Tanam di musim kemarau untuk kualitas terbaik."
            },
            lowland: {
                name: "Dataran Rendah",
                elevationRange: "< 400 MDPL",
                description: "Suhu hangat/panas (>26┬░C), penguapan air cepat, tanah Aluvial/Regosol ΓÇö cocok untuk padi sawah, buah tropis, dan kedelai.",
                colorClass: "zone-lowland",
                plants: [
                    { name: "Padi Sawah", icon: "ph-fill ph-plant", desc: "Staple crop utama, toleran suhu tinggi" },
                    { name: "Mangga Gedong Gincu", icon: "ph-fill ph-tree", desc: "Varietas premium Jawa Barat, harga jual tinggi" },
                    { name: "Kedelai", icon: "ph-fill ph-circle", desc: "Rotasi tanaman, memperbaiki nitrogen alami di tanah" }
                ],
                fertilizers: [
                    "Urea (Nitrogen) untuk pertumbuhan vegetatif cepat pada padi",
                    "SP-36 (Fosfor) untuk pembentukan bulir/buah yang optimal",
                    "NPK Phonska (15-15-15) untuk nutrisi lengkap dan seimbang"
                ],
                dosagePerHa: [
                    { name: "Urea (Nitrogen)", amount: 250, unit: "kg", color: "#7C9473", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "SP-36 (Fosfor)", amount: 150, unit: "kg", color: "#A0522D", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "Urea (Susulan)", amount: 150, unit: "kg", color: "#C67B5C", icon: "<i class='ph-fill ph-flask'></i>" },
                    { name: "KCl (Kalium)", amount: 100, unit: "kg", color: "#D4845A", icon: "<i class='ph-fill ph-flask'></i>" }
                ],
                warnings: ["Manajemen IRIGASI sangat penting ΓÇö tanah dataran rendah cepat kering!", "Gunakan mulsa organik untuk menjaga kelembapan tanah."],
                additionalInfo: "Perhatikan jadwal pengairan. Padi butuh genangan teratur, sementara mangga butuh drainase baik saat musim hujan."
            }
        };

        // ============================================================
        // HELPERS
        // ============================================================
        function determineZone(elevation) {
            if (elevation > 800) return 'highland';
            if (elevation >= 400) return 'midland';
            return 'lowland';
        }

        function animateNumber(element, target, decimals = 0, duration = 600) {
            const startTime = performance.now();
            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;
                element.textContent = current.toFixed(decimals);
                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        }

        function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

        // ============================================================
        // INIT MAP
        // ============================================================
        const sumedangCoords = [-6.8500, 107.9167];
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(sumedangCoords, 13);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri', maxZoom: 19, maxNativeZoom: 18
        }).addTo(map);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19, opacity: 0.45
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // ============================================================
        // DRAWING SETUP
        // ============================================================
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const polygonDrawer = new L.Draw.Polygon(map, {
            allowIntersection: false,
            drawError: { color: '#BF4545', message: '<strong>Error:</strong> Garis tidak boleh bersilangan!' },
            shapeOptions: { color: '#7C9473', weight: 3, fillColor: '#7C9473', fillOpacity: 0.15 }
        });

        // ============================================================
        // UI REFERENCES
        // ============================================================
        
        function safeEl(id) {
            return document.getElementById(id) || document.createElement('div');
        }
    
        const locateBtn = safeEl('locate-btn');
        const drawBtn = safeEl('draw-btn');
        const resetBtn = safeEl('reset-btn');
        const drawTooltip = safeEl('draw-tooltip');
        const loadingOverlay = safeEl('loading-overlay');
        const dataPanel = safeEl('data-panel');
        const closePanelBtn = safeEl('close-panel-btn');
        const errorContainer = safeEl('error-container');
        const fabReopen = safeEl('fab-reopen');
        const scanLine = safeEl('scan-line');
        const saveFarmBtn = safeEl('save-farm-btn');
        const saveModal = safeEl('save-modal');
        const saveForm = safeEl('save-form');
        const saveCancel = safeEl('save-cancel');

        let hasAnalysisResult = false;
        let currentAnalysis = null;
        let currentGeoJSON = null;
        let loadedFarmId = null;

        // ============================================================
        // CHECK IF LOADING EXISTING FARM
        // ============================================================
        const urlParams = new URLSearchParams(window.location.search);
        const farmId = urlParams.get('id');

        if (farmId) {
            loadExistingFarm(parseInt(farmId));
        }

        async function loadExistingFarm(id) {
            try {
                const data = await App.api(`farms.php?id=${id}`);
                const farm = data.farm;

                loadedFarmId = farm.id;
                safeEl('map-title').textContent = farm.name;
                safeEl('map-subtitle').textContent = `${App.getZoneName(farm.zone)} ΓÇó ${parseFloat(farm.area_ha).toFixed(2)} Ha`;

                // Draw the saved polygon on map
                const geojson = typeof farm.geojson === 'string' ? JSON.parse(farm.geojson) : farm.geojson;
                const layer = L.geoJSON(geojson, {
                    style: { color: '#7C9473', weight: 3, fillColor: '#7C9473', fillOpacity: 0.15 }
                });
                drawnItems.clearLayers();
                layer.eachLayer(l => drawnItems.addLayer(l));

                // Fit map to polygon bounds
                map.fitBounds(layer.getBounds(), { padding: [50, 50] });

                // Run analysis on the loaded polygon
                const firstLayer = drawnItems.getLayers()[0];
                if (firstLayer) {
                    analyzePolygon(firstLayer);
                }

                // Hide save button since farm already saved
                saveFarmBtn?.classList.add('hidden');
                resetBtn?.classList.remove('hidden');
                drawBtn?.classList.remove('cta-pulse');

            } catch (err) {
                App.toast('Gagal memuat data lahan', 'error');
            }
        }

        // ============================================================
        // LOADING STEPS
        // ============================================================
        function updateLoadingStep(step) {
            const steps = [document.getElementById('load-step-1'), document.getElementById('load-step-2'), document.getElementById('load-step-3')];
            steps.forEach((el, i) => {
                const dot = el.querySelector('.load-dot');
                const text = el.querySelector('.load-text');
                if (i < step) {
                    dot.className = 'load-dot done';
                    text.className = 'load-text done';
                } else if (i === step) {
                    dot.className = 'load-dot active';
                    text.className = 'load-text active';
                } else {
                    dot.className = 'load-dot pending';
                    text.className = 'load-text pending';
                }
            });
        }

        function triggerScanLine() {
            scanLine?.classList.remove('hidden');
            scanLine.style.animation = 'none';
            void scanLine.offsetWidth;
            scanLine.style.animation = 'scanLine 3s ease-in-out';
            setTimeout(() => scanLine?.classList.add('hidden'), 3100);
        }

        // ============================================================
        // API CALLS
        // ============================================================
        async function fetchElevationData(lat, lon) {
            const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);
            if (!res.ok) throw new Error('Gagal mengambil data elevasi.');
            const data = await res.json();
            return data.elevation[0];
        }

        async function fetchWeatherData(lat, lon) {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia/Jakarta`);
            if (!res.ok) throw new Error('Gagal mengambil data cuaca.');
            const data = await res.json();
            return {
                temperature: data.current.temperature_2m,
                humidity: data.current.relative_humidity_2m,
                precipitation: data.current.precipitation
            };
        }

        // ============================================================
        // ERROR HANDLING
        // ============================================================
        function displayError(message) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                        <span style="font-size:1.1rem; flex-shrink:0; color: var(--color-warning);"><i class="ph-fill ph-warning"></i></span>
                        <div>
                            <p style="font-weight:600; margin-bottom:4px;">Terjadi Kesalahan</p>
                            <p style="font-size:0.8rem; opacity:0.8;">${message}</p>
                            <p style="font-size:0.7rem; opacity:0.6; margin-top:8px;">Coba gambar ulang lahan Anda atau periksa koneksi internet.</p>
                        </div>
                    </div>
                </div>`;
            errorContainer?.classList.remove('hidden');
            dataPanel?.classList.remove('hidden');
            dataPanel?.classList.add('animate-panel-in');
        }

        function clearError() {
            errorContainer.innerHTML = '';
            errorContainer?.classList.add('hidden');
        }

        // ============================================================
        // RENDER RECOMMENDATIONS
        // ============================================================
        function displayRecommendations(zoneKey, elevation) {
            const zone = RECOMMENDATION_DATA[zoneKey];

            document.getElementById('zone-badge').innerHTML = `<span class="zone-badge ${zone.colorClass}">${zone.name} ΓÇö ${Math.round(elevation)} MDPL</span>`;
            document.getElementById('zone-description').textContent = zone.description;

            const plantsContainer = document.getElementById('plants-container');
            plantsContainer.innerHTML = '';
            zone.plants.forEach((plant, index) => {
                const card = document.createElement('div');
                card.className = 'plant-card';
                card.style.opacity = '0';
                card.style.transform = 'translateY(12px)';
                card.innerHTML = `
                    <div class="plant-icon"><i class="${plant.icon}"></i></div>
                    <div style="min-width:0;">
                        <div style="font-weight:600; font-size:0.88rem; color: var(--color-text-primary);">${plant.name}</div>
                        <div style="font-size:0.68rem; color: var(--color-text-muted); line-height:1.4;">${plant.desc}</div>
                    </div>`;
                plantsContainer.appendChild(card);
                setTimeout(() => {
                    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100 + index * 80);
            });

            const fertContainer = document.getElementById('fertilizer-container');
            fertContainer.innerHTML = '';
            zone.fertilizers.forEach(text => {
                const item = document.createElement('div');
                item.style.cssText = 'display:flex; align-items:flex-start; gap:10px; padding:6px 0;';
                item.innerHTML = `
                    <span style="color:var(--color-terracotta); font-size:0.75rem; margin-top:2px; flex-shrink:0;">ΓùÅ</span>
                    <span style="color:var(--color-text-secondary); font-size:0.78rem; line-height:1.6;">${text}</span>`;
                fertContainer.appendChild(item);
            });

            const notesContainer = document.getElementById('notes-container');
            notesContainer.innerHTML = '';
            if (zone.warnings && zone.warnings.length > 0) {
                const wb = document.createElement('div');
                wb.className = 'warning-box';
                wb.innerHTML = zone.warnings.map(w => `<li style="display:flex; gap:8px; align-items:flex-start; margin-bottom:8px;">
                        <span style="font-size:1.1rem; flex-shrink:0; color: var(--color-warning);"><i class="ph-fill ph-warning"></i></span>
                        <span style="font-size:0.8rem; color:var(--color-text-secondary); line-height:1.5;">${w}</span>
                    </li>`).join('');
                notesContainer.appendChild(wb);
            }
            if (zone.additionalInfo) {
                const ib = document.createElement('div');
                ib.className = 'info-box';
                ib.innerHTML = `<p>≡ƒÆí ${zone.additionalInfo}</p>`;
                notesContainer.appendChild(ib);
            }
        }

        function displayDosageCalculation(zoneKey, areaInHectares) {
            const zone = RECOMMENDATION_DATA[zoneKey];
            const dosageContainer = document.getElementById('dosage-container');
            document.getElementById('calc-area-label').textContent = areaInHectares.toFixed(2);
            dosageContainer.innerHTML = '';

            zone.dosagePerHa.forEach((item, index) => {
                const totalDose = item.amount * areaInHectares;
                const displayDose = totalDose < 10 ? totalDose.toFixed(1) : Math.round(totalDose).toLocaleString('id-ID');
                const barPercent = Math.min(100, (totalDose / (item.amount * 5)) * 100);

                const card = document.createElement('div');
                card.className = 'dose-card';
                card.style.opacity = '0';
                card.style.transform = 'translateY(10px)';
                card.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                        <span style="color:var(--color-text-secondary); font-size:0.78rem; font-weight:500; display:flex; align-items:center; gap:6px;">
                            <span style="font-size:0.88rem;">${item.icon}</span>
                            ${item.name}
                        </span>
                        <span style="font-size:0.6rem; color:var(--color-text-dim); font-family:monospace;">${item.amount.toLocaleString('id-ID')} ${item.unit}/Ha</span>
                    </div>
                    <div style="display:flex; align-items:baseline; justify-content:space-between;">
                        <div style="display:flex; align-items:baseline; gap:6px;">
                            <span style="font-size:1.25rem; font-weight:800; font-family:'DM Serif Display',serif; color:${item.color};">${displayDose}</span>
                            <span style="font-size:0.75rem; font-weight:600; color:var(--color-terracotta);">${item.unit}</span>
                        </div>
                        <div style="font-size:0.6rem; color:var(--color-text-dim);">untuk ${areaInHectares.toFixed(2)} Ha</div>
                    </div>
                    <div style="width:100%; background:var(--color-border); border-radius:4px; height:4px; margin-top:10px; overflow:hidden;">
                        <div class="progress-bar-fill" style="width:0%; height:4px; border-radius:4px; background-color:${item.color};"></div>
                    </div>`;
                dosageContainer.appendChild(card);

                setTimeout(() => {
                    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    const bar = card.querySelector('.progress-bar-fill');
                    if (bar) setTimeout(() => bar.style.width = barPercent + '%', 100);
                }, 80 + index * 100);
            });
        }

        // ============================================================
        // MAIN ANALYSIS
        // ============================================================
        async function analyzePolygon(layer) {
            try {
                clearError();
                loadingOverlay?.classList.remove('hidden');
                dataPanel?.classList.add('hidden');
                fabReopen?.classList.add('hidden');
                hasAnalysisResult = false;

                updateLoadingStep(0);
                triggerScanLine();

                const geoJson = layer.toGeoJSON();
                const feature = geoJson.features ? geoJson.features[0] : geoJson;

                if (!feature || !feature.geometry || feature.geometry.type !== 'Polygon') {
                    throw new Error('Bentuk lahan tidak valid. Silakan gambar ulang dengan minimal 3 titik.');
                }

                currentGeoJSON = feature;

                const centroid = turf.centroid(feature);
                const [cLon, cLat] = centroid.geometry.coordinates;
                const areaHa = turf.area(feature) / 10000;

                await sleep(400);
                updateLoadingStep(1);

                const [elevation, weather] = await Promise.all([
                    fetchElevationData(cLat, cLon),
                    fetchWeatherData(cLat, cLon)
                ]);

                updateLoadingStep(2);
                await sleep(300);

                loadingOverlay?.classList.add('hidden');

                animateNumber(safeEl('res-area'), areaHa, 2, 800);
                animateNumber(safeEl('res-elevation'), elevation, 0, 800);
                animateNumber(safeEl('res-temp'), weather.temperature, 1, 600);
                animateNumber(safeEl('res-humidity'), weather.humidity, 0, 600);
                animateNumber(safeEl('res-precip'), weather.precipitation, 1, 600);

                const zoneKey = determineZone(elevation);
                displayRecommendations(zoneKey, elevation);
                displayDosageCalculation(zoneKey, areaHa);

                const now = new Date();
                safeEl('analysis-timestamp').textContent =
                    `Analisis pada ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ΓÇó ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;

                dataPanel?.classList.remove('hidden');
                dataPanel?.classList.add('animate-panel-in');

                resetBtn?.classList.remove('hidden');
                hasAnalysisResult = true;
                drawBtn?.classList.remove('cta-pulse');

                // Show save button only if not already a saved farm
                if (!loadedFarmId) {
                    saveFarmBtn?.classList.remove('hidden');
                }

                // Store analysis data
                currentAnalysis = {
                    areaHa, elevation, zoneKey,
                    latitude: cLat, longitude: cLon,
                    temperature: weather.temperature,
                    humidity: weather.humidity,
                    precipitation: weather.precipitation,
                    recommendations: RECOMMENDATION_DATA[zoneKey].plants.map(p => p.name),
                    dosage: RECOMMENDATION_DATA[zoneKey].dosagePerHa.map(d => ({
                        name: d.name,
                        amount_per_ha: d.amount,
                        total: d.amount * areaHa,
                        unit: d.unit
                    }))
                };

            } catch (error) {
                console.error('Γ¥î Error:', error);
                loadingOverlay?.classList.add('hidden');
                displayError(error.message || 'Terjadi kesalahan teknis.');
                resetBtn?.classList.remove('hidden');
            }
        }

        // ============================================================
        // EVENT HANDLERS
        // ============================================================
        let userMarker = null;

        locateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            locateBtn?.classList.add('active');
            map.locate({ setView: true, maxZoom: 16 });
        });

        map.on('locationfound', function(e) {
            locateBtn?.classList.remove('active');
            if (!userMarker) {
                userMarker = L.circleMarker(e.latlng, {
                    radius: 8,
                    fillColor: "#7C9473",
                    color: "#3D2B1F",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(map);
            } else {
                userMarker.setLatLng(e.latlng);
            }
        });

        map.on('locationerror', function(e) {
            locateBtn?.classList.remove('active');
            App.toast('Gagal mendapatkan lokasi Anda.', 'error');
        });

        drawBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            polygonDrawer.enable();
            drawBtn?.classList.add('active');
            drawBtn?.classList.remove('cta-pulse');
            drawTooltip?.classList.remove('hidden');
        });

        map.on(L.Draw.Event.CREATED, function (event) {
            drawnItems.clearLayers();
            drawnItems.addLayer(event.layer);
            polygonDrawer.disable();
            drawBtn?.classList.remove('active');
            drawTooltip?.classList.add('hidden');
            loadedFarmId = null; // New polygon = new farm
            analyzePolygon(event.layer);
        });

        map.on('draw:drawstop', function () {
            drawBtn?.classList.remove('active');
            drawTooltip?.classList.add('hidden');
        });

        resetBtn.addEventListener('click', () => {
            drawnItems.clearLayers();
            dataPanel?.classList.add('hidden');
            resetBtn?.classList.add('hidden');
            fabReopen?.classList.add('hidden');
            saveFarmBtn?.classList.add('hidden');
            hasAnalysisResult = false;
            currentAnalysis = null;
            currentGeoJSON = null;
            loadedFarmId = null;
            clearError();
            drawBtn?.classList.add('cta-pulse');
            // Reset UI
            safeEl('map-title').textContent = 'Peta Lahan';
            safeEl('map-subtitle').textContent = 'Gambar batas lahan untuk memulai analisis';
        });

        closePanelBtn.addEventListener('click', () => {
            dataPanel?.classList.add('hidden');
            if (hasAnalysisResult) fabReopen?.classList.remove('hidden');
        });

        fabReopen.addEventListener('click', () => {
            dataPanel?.classList.remove('hidden');
            dataPanel?.classList.add('animate-panel-in');
            fabReopen?.classList.add('hidden');
        });

        // ============================================================
        // SAVE FARM
        // ============================================================
        saveFarmBtn.addEventListener('click', () => {
            saveModal?.classList.add('active');
            document.getElementById('farm-name').focus();
        });

        saveCancel.addEventListener('click', () => {
            saveModal?.classList.remove('active');
        });

        saveForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentAnalysis || !currentGeoJSON) {
                App.toast('Tidak ada data analisis untuk disimpan', 'error');
                return;
            }

            const submitBtn = document.getElementById('save-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';

            const name = document.getElementById('farm-name').value.trim() || 'Lahan Saya';
            const notes = document.getElementById('farm-notes').value.trim();

            try {
                // Save farm
                const farmData = await App.api('farms.php?action=save', {
                    method: 'POST',
                    body: JSON.stringify({
                        name,
                        geojson: JSON.stringify(currentGeoJSON),
                        area_ha: currentAnalysis.areaHa,
                        elevation: currentAnalysis.elevation,
                        zone: currentAnalysis.zoneKey,
                        latitude: currentAnalysis.latitude,
                        longitude: currentAnalysis.longitude,
                        notes,
                    }),
                });

                // Save analysis
                await App.api('farms.php?action=analyze', {
                    method: 'POST',
                    body: JSON.stringify({
                        farm_id: farmData.farm_id,
                        temperature: currentAnalysis.temperature,
                        humidity: currentAnalysis.humidity,
                        precipitation: currentAnalysis.precipitation,
                        zone: currentAnalysis.zoneKey,
                        recommendations: currentAnalysis.recommendations,
                        dosage: currentAnalysis.dosage,
                    }),
                });

                loadedFarmId = farmData.farm_id;
                saveModal?.classList.remove('active');
                saveFarmBtn?.classList.add('hidden');
                App.toast('≡ƒî╛ Lahan berhasil disimpan!', 'success');

                safeEl('map-title').textContent = '≡ƒî┐ ' + name;

            } catch (err) {
                App.toast(err.message || 'Gagal menyimpan lahan', 'error');
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Simpan';
        });
    });
    