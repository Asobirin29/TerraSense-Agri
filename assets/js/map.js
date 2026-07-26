
    window.initMap = async function () {
        // ============================================================
        // AUTH CHECK
        // ============================================================
        const currentUser = await App.checkAuth();
        if (!currentUser) return;

        // ============================================================
        // FETCH CROPS DATABASE
        // ============================================================
        let CROPS_DATABASE = [];
        try {
            const res = await fetch('/TerraSense-Agri/assets/data/crops.json');
            CROPS_DATABASE = await res.json();
        } catch (e) {
            console.error('Failed to load crops database', e);
        }

        // ============================================================
        // CROP INPUT IS NOW TEXT, NO NEED TO POPULATE SELECT
        // ============================================================

        // ============================================================
        // RECOMMENDATION DATA
        // ============================================================
        const RECOMMENDATION_DATA = {
            highland: {
                name: "Dataran Tinggi",
                elevationRange: "> 800 MDPL",
                description: "Suhu sejuk (<22┬░C), curah hujan tinggi, tanah Andosol vulkanik ΓÇö zona ideal untuk tanaman dataran tinggi bernilai ekonomi premium seperti kopi arabika dan sayuran.",
                colorClass: "zone-highland",
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
        window.map = map; // Expose to window for sidebar toggle resizing

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

        // Panel show/hide helpers — panels use style.display, NOT Tailwind 'hidden'
        function showPanel(el) {
            if (!el || !el.id) return;
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.gap = '16px';
        }
        function hidePanel(el) {
            if (!el || !el.id) return;
            el.style.display = 'none';
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
        const editFarmBtn = safeEl('edit-farm-btn');
        const farmModal = safeEl('farm-modal');
        const farmForm = safeEl('farm-form');
        const farmCancel = safeEl('farm-cancel');
        const newAnalysisBtn = safeEl('new-analysis-btn');
        const closeRecsBtn = safeEl('close-recommendations-btn');
        const fabRecs = safeEl('fab-recommendations');
        const rightPanel = safeEl('right-panel');

        let hasAnalysisResult = false;
        let currentAnalysis = null;
        let currentGeoJSON = null;
        let loadedFarmId = null;
        let currentLoadedFarm = null;

        // ============================================================
        // CHECK IF LOADING EXISTING FARM
        // ============================================================
        const urlParams = new URLSearchParams(window.location.search);
        const farmId = urlParams.get('id');
        const triggerDraw = urlParams.get('draw');

        if (farmId) {
            loadExistingFarm(parseInt(farmId));
        } else if (triggerDraw === 'true') {
            setTimeout(() => {
                polygonDrawer.enable();
                drawBtn?.classList.add('active');
                drawBtn?.classList.remove('cta-pulse');
                drawTooltip?.classList.remove('hidden');
                hidePanel(dataPanel);
                hidePanel(rightPanel);
            }, 600);
        }

        try {
            const data = await App.api('farms.php');
            const listEl = safeEl('sidebar-farms-list');
            
            if (!data.farms || data.farms.length === 0) {
                listEl.innerHTML = '<div class="text-on-primary/50 text-xs italic py-2">Belum ada data lahan.</div>';
                return;
            }
            
            listEl.innerHTML = '';
            data.farms.forEach(f => {
                const el = document.createElement('a');
                el.href = `?id=${f.id}`;
                
                const isPlanted = f.crop_id && f.planting_date;
                const cropName = isPlanted ? (CROPS_DATABASE.find(c => c.id == f.crop_id || c.name == f.crop_id)?.name || 'Ditanami') : 'Belum Ditanami';
                const badgeClass = isPlanted ? 'bg-sage-accent/20 text-sage-accent' : 'bg-white/10 text-white/50';

                el.className = `flex flex-col px-3 py-2 rounded-lg hover:bg-white/10 transition-colors ${loadedFarmId == f.id ? 'bg-white/10 border border-white/20' : ''}`;
                el.innerHTML = `
                    <div class="text-sm font-medium text-white">${f.name}</div>
                    <div class="flex items-center justify-between mt-1">
                        <div class="text-xs text-on-primary/70">${parseFloat(f.area_ha).toFixed(2)} Ha</div>
                        <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${badgeClass}">${cropName}</span>
                    </div>
                `;
                listEl.appendChild(el);
            });
        } catch (err) {
            console.error('Failed to load farm list', err);
        }

        async function loadExistingFarm(id) {
            try {
                const data = await App.api(`farms.php?id=${id}`);
                const farm = data.farm;
                currentLoadedFarm = farm;

                loadedFarmId = farm.id;
                // map-title / map-subtitle may not exist in all layouts
                const mapTitleEl = document.getElementById('map-title');
                if (mapTitleEl) mapTitleEl.textContent = farm.name;
                const mapSubEl = document.getElementById('map-subtitle');
                if (mapSubEl) mapSubEl.textContent = `${App.getZoneName ? App.getZoneName(farm.zone) : farm.zone} · ${parseFloat(farm.area_ha).toFixed(2)} Ha`;
                
                // Populate new fields
                const crop = CROPS_DATABASE.find(c => c.name.toLowerCase() === (farm.crop_id || '').toLowerCase() || c.id === farm.crop_id);
                safeEl('res-crop').textContent = (crop ? crop.name : farm.crop_id) || 'Belum Diatur';
                safeEl('res-irrigation').textContent = farm.irrigation_status || 'Tidak Ada Irigasi';
                
                if (farm.planting_date && crop) {
                    const d = new Date(farm.planting_date);
                    d.setDate(d.getDate() + crop.harvest_days);
                    safeEl('res-harvest').textContent = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
                } else {
                    safeEl('res-harvest').textContent = '-';
                }

                const activeCropInfo = document.getElementById('active-crop-info');
                const emptyCropInfo = document.getElementById('empty-crop-info');
                const monitoringSection = document.getElementById('growth-monitoring-section');

                if (farm.planting_date && crop) {
                    if (activeCropInfo) activeCropInfo.classList.remove('hidden');
                    if (emptyCropInfo) emptyCropInfo.classList.add('hidden');
                    if (monitoringSection) monitoringSection.classList.remove('hidden');
                    const plantingDateObj = new Date(farm.planting_date);
                    const today = new Date();
                    const diffTime = today - plantingDateObj;
                    const daysElapsed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                    const totalDays = crop.harvest_days;
                    const percent = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
                    
                    safeEl('res-growth-percent').textContent = `${percent}%`;
                    const barEl = document.getElementById('res-growth-bar');
                    if (barEl) barEl.style.width = `${percent}%`;
                    safeEl('res-growth-days-elapsed').textContent = `Hari ke-${daysElapsed}`;
                    safeEl('res-growth-days-total').textContent = `${totalDays} Hari`;
                    
                    let stageText = 'Semai';
                    let stageClass = 'bg-slate-soil/15 text-slate-soil';
                    if (percent > 20 && percent <= 50) {
                        stageText = 'Vegetatif';
                        stageClass = 'bg-sage-accent/20 text-deep-moss';
                        if (barEl) barEl.className = 'bg-sage-accent h-full rounded-full transition-all duration-500';
                    } else if (percent > 50 && percent <= 85) {
                        stageText = 'Generatif';
                        stageClass = 'bg-sunset-gold/25 text-on-secondary-container';
                        if (barEl) barEl.className = 'bg-sunset-gold h-full rounded-full transition-all duration-500';
                    } else if (percent > 85 && percent <= 100) {
                        stageText = 'Siap Panen';
                        stageClass = 'bg-burnt-terracotta/20 text-burnt-terracotta';
                        if (barEl) barEl.className = 'bg-burnt-terracotta h-full rounded-full transition-all duration-500';
                    } else if (percent > 100) {
                        stageText = 'Lewat Panen';
                        stageClass = 'bg-error/20 text-error';
                        if (barEl) barEl.className = 'bg-error h-full rounded-full transition-all duration-500';
                    }
                    
                    const stageBadge = document.getElementById('res-growth-stage');
                    if (stageBadge) {
                        stageBadge.textContent = stageText;
                        stageBadge.className = `${stageClass} text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider`;
                    }
                    
                    const areaHa = parseFloat(farm.area_ha || 0);
                    const cropYieldPerHa = parseFloat(crop.yield_ton_per_ha || 5.0);
                    const estYield = areaHa * cropYieldPerHa;
                    safeEl('res-est-yield-value').textContent = `${estYield.toFixed(2)} Ton`;
                    
                    if (monitoringSection) monitoringSection.classList.remove('hidden');
                    
                    const triggerBtn = document.getElementById('btn-trigger-harvest');
                    if (triggerBtn) {
                        const newBtn = triggerBtn.cloneNode(true);
                        triggerBtn.parentNode.replaceChild(newBtn, triggerBtn);
                        newBtn.addEventListener('click', () => {
                            document.getElementById('harvest-farm-id').value = farm.id;
                            document.getElementById('harvest-crop-id').value = crop.id;
                            document.getElementById('harvest-crop-name').value = crop.name;
                            document.getElementById('harvest-planting-date').value = farm.planting_date;
                            document.getElementById('harvest-est-yield').value = estYield;
                            document.getElementById('harvest-farm-name-display').value = farm.name;
                            document.getElementById('harvest-crop-name-display').value = crop.name;
                            
                            document.getElementById('harvest-date').value = new Date().toISOString().split('T')[0];
                            document.getElementById('harvest-actual-yield').value = estYield.toFixed(2);
                            document.getElementById('harvest-notes').value = '';
                            
                            const modal = document.getElementById('harvest-modal');
                            if (modal) {
                                modal.classList.remove('hidden');
                                modal.classList.add('flex');
                            }
                        });
                    }
                    const fertToggle = document.getElementById('toggle-fertilizer');
                    if (fertToggle) {
                        fertToggle.checked = (farm.is_fertilized == 1);
                        fertToggle.onchange = async () => {
                            try {
                                await App.api('farms.php?action=update', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        id: farm.id,
                                        is_fertilized: fertToggle.checked ? 1 : 0
                                    })
                                });
                                App.toast('Status pupuk diperbarui!', 'success');
                            } catch (e) {
                                App.toast('Gagal mengupdate status pupuk', 'error');
                                fertToggle.checked = !fertToggle.checked;
                            }
                        };
                    }

                    const editPlantBtn = document.getElementById('btn-edit-plant');
                    if (editPlantBtn) {
                        editPlantBtn.onclick = () => {
                            if (activeCropInfo) activeCropInfo.classList.add('hidden');
                            if (monitoringSection) monitoringSection.classList.add('hidden');
                            if (emptyCropInfo) emptyCropInfo.classList.remove('hidden');
                        };
                    }

                } else {
                    if (monitoringSection) monitoringSection.classList.add('hidden');
                    if (activeCropInfo) activeCropInfo.classList.add('hidden');
                    if (emptyCropInfo) emptyCropInfo.classList.remove('hidden');
                }

                // Populate Plant Form
                const plantSelect = document.getElementById('plant-crop-id');
                if (plantSelect) {
                    plantSelect.innerHTML = '<option value="">Pilih Komoditas...</option>' + 
                        CROPS_DATABASE.map(c => `<option value="${c.id}" ${farm.crop_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('');
                }
                const plantDateInput = document.getElementById('plant-date');
                if (plantDateInput) {
                    plantDateInput.value = farm.planting_date ? farm.planting_date.split('T')[0] : new Date().toISOString().split('T')[0];
                }

                const plantForm = document.getElementById('plant-form');
                if (plantForm) {
                    plantForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const btn = plantForm.querySelector('button[type="submit"]');
                        btn.disabled = true;
                        btn.innerHTML = 'Menyimpan...';
                        try {
                            await App.api('farms.php?action=update', {
                                method: 'POST',
                                body: JSON.stringify({
                                    id: farm.id,
                                    crop_id: plantSelect.value,
                                    planting_date: plantDateInput.value
                                })
                            });
                            App.toast('Siklus tanam berhasil dimulai!', 'success');
                            setTimeout(() => window.location.reload(), 500);
                        } catch (err) {
                            App.toast(err.message || 'Gagal memulai tanam', 'error');
                            btn.disabled = false;
                            btn.innerHTML = 'Simpan Tanaman';
                        }
                    };
                }

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
                if (!el) return;
                const dot = el.querySelector('.load-dot');
                const text = el.querySelector('.load-text');
                if (dot && text) {
                    if (i < step) {
                        dot.className = 'load-dot done';
                        text.className = 'load-text done';
                    } else if (i === step) {
                        dot.className = 'load-dot active';
                        text.className = 'load-text active';
                    } else {
                        dot.className = 'load-dot';
                        text.className = 'load-text';
                    }
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
                <div style="background:rgba(186,26,26,0.08); border:1px solid rgba(186,26,26,0.2); border-radius:12px; padding:14px; margin-bottom:12px;">
                    <div style="display:flex; align-items:flex-start; gap:10px;">
                        <span style="font-size:18px; flex-shrink:0; color:#ba1a1a;">⚠</span>
                        <div>
                            <p style="font-weight:600; margin-bottom:4px; color:#2D4B3F; font-size:14px;">Terjadi Kesalahan</p>
                            <p style="font-size:13px; color:rgba(74,66,56,0.8); line-height:1.5;">${message}</p>
                            <p style="font-size:11px; color:rgba(74,66,56,0.55); margin-top:8px;">Coba gambar ulang lahan Anda atau periksa koneksi internet.</p>
                        </div>
                    </div>
                </div>`;
            if (errorContainer) errorContainer.style.display = 'block';
            showPanel(dataPanel);
        }

        function clearError() {
            errorContainer.innerHTML = '';
            if (errorContainer) errorContainer.style.display = 'none';
        }

        // ============================================================
        // SUITABILITY CALCULATION (Advanced Agro-ecological Model)
        // ============================================================
        function calculateSuitability(crop, elevation, temperature, ph, soilType, irrigation) {
            // 1. Elevation Score (35% weight)
            let elevScore = 100;
            if (elevation < crop.min_elevation) {
                const diff = crop.min_elevation - elevation;
                elevScore = Math.max(10, 100 - (diff / 4)); // Lose 1% per 4m deviation
            } else if (elevation > crop.max_elevation) {
                const diff = elevation - crop.max_elevation;
                elevScore = Math.max(10, 100 - (diff / 8)); // Lose 1% per 8m deviation
            }

            // 2. Temperature Score (25% weight)
            let tempScore = 100;
            if (temperature < crop.min_temp) {
                const diff = crop.min_temp - temperature;
                tempScore = Math.max(10, 100 - (diff * 12)); // Lose 12% per 1°C deviation
            } else if (temperature > crop.max_temp) {
                const diff = temperature - crop.max_temp;
                tempScore = Math.max(10, 100 - (diff * 12)); // Lose 12% per 1°C deviation
            }

            // 3. Soil pH Score (20% weight)
            let phScore = 100;
            if (ph < crop.min_ph) {
                const diff = crop.min_ph - ph;
                phScore = Math.max(10, 100 - (diff * 50)); // Lose 5% per 0.1 pH deviation
            } else if (ph > crop.max_ph) {
                const diff = ph - crop.max_ph;
                phScore = Math.max(10, 100 - (diff * 50)); // Lose 5% per 0.1 pH deviation
            }

            // 4. Soil Type compatibility (10% weight)
            let soilScore = 40; // Default mismatch penalty
            if (crop.preferred_soil && crop.preferred_soil.includes(soilType)) {
                soilScore = 100;
            }

            // 5. Irrigation compatibility (10% weight)
            let irrigationScore = 100;
            if (irrigation === 'Tidak Ada Irigasi') {
                if (crop.irrigation_need === 'Tinggi') {
                    irrigationScore = 30;
                } else if (crop.irrigation_need === 'Sedang') {
                    irrigationScore = 70;
                }
            } else if (irrigation === 'Tadah Hujan') {
                if (crop.irrigation_need === 'Tinggi') {
                    irrigationScore = 65;
                }
            }

            // Calculate weighted average
            const score = Math.round(
                (elevScore * 0.35) + 
                (tempScore * 0.25) + 
                (phScore * 0.20) + 
                (soilScore * 0.10) + 
                (irrigationScore * 0.10)
            );

            return Math.max(10, Math.min(100, score));
        }

        // ============================================================
        // RENDER RECOMMENDATIONS
        // ============================================================
        function displayRecommendations(zoneKey, elevation, temperature = 26) {
            const zone = RECOMMENDATION_DATA[zoneKey];

            // Update zone info safely (elements may not exist)
            const zoneBadgeEl = document.getElementById('zone-badge');
            if (zoneBadgeEl) zoneBadgeEl.innerHTML = `<span class="zone-badge ${zone.colorClass}">${zone.name} — ${Math.round(elevation)} MDPL</span>`;
            const zoneDescEl = document.getElementById('zone-description');
            if (zoneDescEl) zoneDescEl.textContent = zone.description;

            // Update recommendation panel header title to show zone info
            const recHeader = document.getElementById('rec-header');
            if (recHeader) recHeader.innerHTML = `Rekomendasi Tanaman <span style="font-size:9px; background:rgba(45,75,63,0.12); color:#2D4B3F; padding:2px 6px; border-radius:4px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-left:4px;">${zone.name}</span>`;

            // Generate Soil Profile dynamically based on elevation
            let ph = 6.2;
            let soilType = "Latosol";
            if (elevation > 800) {
                ph = 5.2;
                soilType = "Andosol";
            } else if (elevation < 400) {
                ph = 6.8;
                soilType = "Aluvial";
            }

            // Update Soil Profile in Analisis Lahan UI
            const phEl = safeEl('res-ph');
            const soilEl = safeEl('res-soil');
            if (phEl) phEl.textContent = ph.toFixed(1);
            if (soilEl) soilEl.textContent = soilType;

            const plantsContainer = document.getElementById('recommendation-list');
            if (plantsContainer) {
                plantsContainer.innerHTML = '';
                
                const irrigation = currentLoadedFarm?.irrigation_status || document.getElementById('farm-irrigation')?.value || 'Tidak Ada Irigasi';

                // Calculate suitability dynamically for all crops
                const calculatedCrops = CROPS_DATABASE.map(crop => {
                    const score = calculateSuitability(crop, elevation, temperature, ph, soilType, irrigation);
                    return { ...crop, dynamicSuitability: score };
                });

                // Sort by suitability descending
                calculatedCrops.sort((a, b) => b.dynamicSuitability - a.dynamicSuitability);

                // Render top 5 recommendations
                const topCrops = calculatedCrops.slice(0, 5);
                
                topCrops.forEach((plant, index) => {
                    const card = document.createElement('div');
                    card.className = 'flex items-start gap-3 group cursor-pointer hover:bg-white/40 p-3 rounded-lg border border-slate-soil/5 transition-all';
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(12px)';
                    
                    const score = plant.dynamicSuitability;
                    const suitabilityColor = score > 85 ? 'text-sage-accent' : (score > 60 ? 'text-sunset-gold' : 'text-burnt-terracotta');
                    const suitabilityBg = score > 85 ? 'bg-sage-accent/10' : (score > 60 ? 'bg-sunset-gold/10' : 'bg-burnt-terracotta/10');
                    
                    card.innerHTML = `
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span class="bg-deep-moss/10 text-deep-moss text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">${plant.category}</span>
                                <span class="${suitabilityBg} ${suitabilityColor} text-[10px] px-2 py-0.5 rounded-full font-bold">Cocok: ${score}%</span>
                            </div>
                            <p class="font-button text-deep-moss font-semibold text-sm mb-1">${plant.name}</p>
                            <p class="text-[11px] text-slate-soil/75 mb-2 leading-relaxed">${plant.description}</p>
                            <div class="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-slate-soil/5 text-[9px] text-slate-soil/70 font-semibold">
                                <span class="flex items-center gap-1.5 truncate">
                                    <span class="material-symbols-outlined text-[11px] text-sage-accent">layers</span> 
                                    ${plant.preferred_soil ? plant.preferred_soil.join(', ') : '-'}
                                </span>
                                <span class="flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-[11px] text-sage-accent">water_drop</span> 
                                    Irigasi: ${plant.irrigation_need || 'Sedang'}
                                </span>
                                <span class="flex items-center gap-1.5 col-span-2">
                                    <span class="material-symbols-outlined text-[11px] text-sage-accent">calendar_month</span> 
                                    Masa Panen: ${plant.harvest_days} Hari
                                </span>
                            </div>
                        </div>
                        <span class="material-symbols-outlined ml-auto text-slate-soil/30 group-hover:text-burnt-terracotta flex-shrink-0 self-center">arrow_forward_ios</span>
                    `;
                    plantsContainer.appendChild(card);
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 100 + index * 80);
                });
            }

            const fertContainer = document.getElementById('fertilizer-container');
            if (fertContainer) {
                fertContainer.innerHTML = '';
                zone.fertilizers.forEach(text => {
                    const item = document.createElement('div');
                    item.style.cssText = 'display:flex; align-items:flex-start; gap:10px; padding:6px 0;';
                    item.innerHTML = `
                        <span style="color:var(--color-terracotta); font-size:0.75rem; margin-top:2px; flex-shrink:0;">ΓùÅ</span>
                        <span style="color:var(--color-text-secondary); font-size:0.78rem; line-height:1.6;">${text}</span>`;
                    fertContainer.appendChild(item);
                });
            }

            const notesContainer = document.getElementById('notes-container');
            if (notesContainer) {
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
        }

        function displayDosageCalculation(zoneKey, areaInHectares) {
            const zone = RECOMMENDATION_DATA[zoneKey];
            const dosageContainer = safeEl('dosage-container');
            const calcLabel = safeEl('calc-area-label');
            if (calcLabel) calcLabel.textContent = areaInHectares.toFixed(2);
            dosageContainer.innerHTML = '';

            zone.dosagePerHa.forEach((item, index) => {
                const totalDose = item.amount * areaInHectares;
                const displayDose = totalDose < 10 ? totalDose.toFixed(1) : Math.round(totalDose).toLocaleString('id-ID');
                const barPercent = Math.min(100, (totalDose / (item.amount * 5)) * 100);

                const card = document.createElement('div');
                card.className = 'dose-item';
                card.style.cssText = 'opacity:0; transform:translateY(10px); padding: 12px 0;';
                card.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                        <span style="color:#2D4B3F; font-size:13px; font-weight:500; display:flex; align-items:center; gap:6px;">
                            ${item.name}
                        </span>
                        <span style="font-size:10px; color:rgba(74,66,56,0.6); font-family:monospace;">${item.amount.toLocaleString('id-ID')} ${item.unit}/Ha</span>
                    </div>
                    <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:8px;">
                        <div style="display:flex; align-items:baseline; gap:5px;">
                            <span style="font-size:22px; font-weight:800; font-family:'DM Serif Display',serif; color:${item.color};">${displayDose}</span>
                            <span style="font-size:12px; font-weight:600; color:#C35E3D;">${item.unit}</span>
                        </div>
                        <span style="font-size:10px; color:rgba(74,66,56,0.55);">untuk ${areaInHectares.toFixed(2)} Ha</span>
                    </div>
                    <div style="width:100%; background:rgba(74,66,56,0.1); border-radius:4px; height:4px; overflow:hidden;">
                        <div class="progress-bar-fill" style="width:0%; height:4px; border-radius:4px; background-color:${item.color}; transition:width 0.6s ease;"></div>
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
                hidePanel(dataPanel);
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
                displayRecommendations(zoneKey, elevation, weather.temperature);
                displayDosageCalculation(zoneKey, areaHa);

                const now = new Date();
                const tsText = `Analisis: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
                // analysis-timestamp may not exist in new layout, use rec-timestamp only
                const atsEl = document.getElementById('analysis-timestamp');
                if (atsEl) atsEl.textContent = tsText;
                const rtsEl = document.getElementById('rec-timestamp');
                if (rtsEl) rtsEl.textContent = tsText;

                // Show panels using style.display (panels use inline flex, not Tailwind hidden)
                showPanel(dataPanel);
                showPanel(rightPanel);
                if (fabRecs) hidePanel(fabRecs);

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
                    recommendations: (() => {
                        const irrigation = currentLoadedFarm?.irrigation_status || document.getElementById('farm-irrigation')?.value || 'Tidak Ada Irigasi';
                        let ph = 6.2;
                        let soilType = "Latosol";
                        if (elevation > 800) {
                            ph = 5.2;
                            soilType = "Andosol";
                        } else if (elevation < 400) {
                            ph = 6.8;
                            soilType = "Aluvial";
                        }
                        return CROPS_DATABASE.map(crop => {
                            const score = calculateSuitability(crop, elevation, weather.temperature, ph, soilType, irrigation);
                            return { ...crop, dynamicSuitability: score };
                        })
                        .sort((a, b) => b.dynamicSuitability - a.dynamicSuitability)
                        .slice(0, 5)
                        .map(p => p.name);
                    })(),
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
            
            // Hide panels to give full screen space for drawing
            hidePanel(dataPanel);
            hidePanel(rightPanel);
            if (fabRecs) fabRecs.style.display = 'none';
            fabReopen?.classList.add('hidden');
        });

        map.on(L.Draw.Event.CREATED, function (event) {
            drawnItems.clearLayers();
            drawnItems.addLayer(event.layer);
            polygonDrawer.disable();
            drawBtn?.classList.remove('active');
            drawTooltip?.classList.add('hidden');
            if (fabRecs) fabRecs.style.display = 'none';
            loadedFarmId = null; // New polygon = new farm
            analyzePolygon(event.layer);
        });

        map.on('draw:drawstop', function () {
            drawBtn?.classList.remove('active');
            drawTooltip?.classList.add('hidden');
            // If they cancel drawing and there was an analysis, show the panels again
            if (hasAnalysisResult) {
                showPanel(rightPanel);
            }
        });

        resetBtn.addEventListener('click', async () => {
            if (loadedFarmId) {
                const result = await Swal.fire({
                    title: 'Hapus Lahan?',
                    text: "Tindakan ini tidak dapat dibatalkan!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#C35E3D',
                    cancelButtonColor: '#4A4238',
                    confirmButtonText: 'Ya, Hapus!',
                    cancelButtonText: 'Batal'
                });

                if (result.isConfirmed) {
                    try {
                        await App.api(`farms.php?action=delete`, {
                            method: 'POST',
                            body: JSON.stringify({ id: loadedFarmId })
                        });
                        App.toast('Lahan berhasil dihapus!', 'success');
                        setTimeout(() => window.location.href = 'farm-map.html', 500);
                    } catch (err) {
                        App.toast('Gagal menghapus lahan', 'error');
                    }
                }
                return;
            }

            drawnItems.clearLayers();
            hidePanel(dataPanel);
            hidePanel(rightPanel);
            if (fabRecs) fabRecs.style.display = 'none';
            resetBtn?.classList.add('hidden');
            fabReopen?.classList.add('hidden');
            saveFarmBtn?.classList.add('hidden');
            hasAnalysisResult = false;
            currentAnalysis = null;
            currentGeoJSON = null;
            loadedFarmId = null;
            clearError();
            drawBtn?.classList.add('cta-pulse');
            // Reset page title if element exists
            const titleEl = document.getElementById('map-title');
            if (titleEl) titleEl.textContent = 'Peta Lahan';
            const subtitleEl = document.getElementById('map-subtitle');
            if (subtitleEl) subtitleEl.textContent = 'Gambar batas lahan untuk memulai analisis';
        });

        closePanelBtn.addEventListener('click', () => {
            hidePanel(dataPanel);
            if (hasAnalysisResult) fabReopen?.classList.remove('hidden');
        });

        fabReopen.addEventListener('click', () => {
            showPanel(dataPanel);
            fabReopen?.classList.add('hidden');
        });

        closeRecsBtn.addEventListener('click', () => {
            hidePanel(rightPanel);
            if (fabRecs && fabRecs.id) fabRecs.style.display = 'flex';
        });

        fabRecs.addEventListener('click', () => {
            showPanel(rightPanel);
            if (fabRecs) fabRecs.style.display = 'none';
        });

        newAnalysisBtn.addEventListener('click', () => {
            if (urlParams.get('id')) {
                window.location.href = 'farm-map.html?draw=true';
            } else {
                resetBtn.click();
                polygonDrawer.enable();
                drawBtn?.classList.add('active');
                drawBtn?.classList.remove('cta-pulse');
                drawTooltip?.classList.remove('hidden');
                hidePanel(dataPanel);
                hidePanel(rightPanel);
                if (fabRecs) fabRecs.style.display = 'none';
            }
        });

        // ============================================================
        // EDIT / SAVE FARM MODAL
        // ============================================================
        // Removed duplicate const declarations
        let isEditing = false;

        saveFarmBtn.addEventListener('click', () => {
            isEditing = false;
            safeEl('modal-title').textContent = 'Simpan Lahan Baru';
            document.getElementById('farm-name').value = '';
            document.getElementById('farm-notes').value = '';
            document.getElementById('farm-crop').value = '';
            document.getElementById('farm-planting-date').value = '';
            document.getElementById('farm-irrigation').value = 'Tidak Ada Irigasi';
            
            farmModal?.classList.remove('hidden');
            farmModal?.classList.add('flex');
            document.getElementById('farm-name').focus();
        });

        editFarmBtn.addEventListener('click', () => {
            isEditing = true;
            safeEl('modal-title').textContent = 'Edit Lahan';
            if (currentLoadedFarm) {
                document.getElementById('farm-name').value = currentLoadedFarm.name || '';
                document.getElementById('farm-notes').value = currentLoadedFarm.notes || '';
                document.getElementById('farm-crop').value = currentLoadedFarm.crop_id || '';
                document.getElementById('farm-planting-date').value = currentLoadedFarm.planting_date || '';
                document.getElementById('farm-irrigation').value = currentLoadedFarm.irrigation_status || 'Tidak Ada Irigasi';
            }
            farmModal?.classList.remove('hidden');
            farmModal?.classList.add('flex');
            document.getElementById('farm-name').focus();
        });

        farmCancel.addEventListener('click', () => {
            farmModal?.classList.add('hidden');
            farmModal?.classList.remove('flex');
        });

        farmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isEditing && (!currentAnalysis || !currentGeoJSON)) {
                App.toast('Tidak ada data analisis untuk disimpan', 'error');
                return;
            }

            const submitBtn = document.getElementById('farm-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';

            const name = document.getElementById('farm-name').value.trim() || 'Lahan Saya';
            const notes = document.getElementById('farm-notes').value.trim();
            const crop_id = document.getElementById('farm-crop').value;
            const planting_date = document.getElementById('farm-planting-date').value;
            const irrigation_status = document.getElementById('farm-irrigation').value;

            try {
                if (isEditing && loadedFarmId) {
                    await App.api(`farms.php?action=update&id=${loadedFarmId}`, {
                        method: 'POST',
                        body: JSON.stringify({ name, notes, crop_id, planting_date, irrigation_status }),
                    });
                    App.toast('Lahan berhasil diperbarui!', 'success');
                    // Reload
                    setTimeout(() => window.location.reload(), 500);
                } else {
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
                            crop_id,
                            planting_date,
                            irrigation_status
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
                    farmModal?.classList.add('hidden');
                    farmModal?.classList.remove('flex');
                    saveFarmBtn?.classList.add('hidden');
                    editFarmBtn?.classList.remove('hidden');
                    App.toast('Lahan berhasil disimpan!', 'success');
                    
                    // Reload to show edit state
                    setTimeout(() => window.location.search = '?id=' + loadedFarmId, 500);
                }
            } catch (err) {
                App.toast(err.message || 'Gagal menyimpan lahan', 'error');
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Simpan';
        });

        // ============================================================
        // HARVEST LOGS MODAL & ACTIONS
        // ============================================================
        const harvestModal = safeEl('harvest-modal');
        const harvestForm = safeEl('harvest-form');
        const harvestCancel = safeEl('harvest-cancel');

        if (harvestCancel) {
            harvestCancel.addEventListener('click', () => {
                harvestModal?.classList.add('hidden');
                harvestModal?.classList.remove('flex');
            });
        }

        if (harvestForm) {
            harvestForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = document.getElementById('harvest-submit');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
                }

                const farmId = parseInt(document.getElementById('harvest-farm-id').value);
                const cropId = document.getElementById('harvest-crop-id').value;
                const cropName = document.getElementById('harvest-crop-name').value;
                const plantingDate = document.getElementById('harvest-planting-date').value;
                const harvestDate = document.getElementById('harvest-date').value;
                const estimatedYield = parseFloat(document.getElementById('harvest-est-yield').value);
                const actualYield = parseFloat(document.getElementById('harvest-actual-yield').value);
                const notes = document.getElementById('harvest-notes').value.trim();

                try {
                    await App.api('harvests.php?action=save', {
                        method: 'POST',
                        body: JSON.stringify({
                            farm_id: farmId,
                            crop_id: cropId,
                            crop_name: cropName,
                            planting_date: plantingDate,
                            harvest_date: harvestDate,
                            estimated_yield_ton: estimatedYield,
                            actual_yield_ton: actualYield,
                            notes: notes
                        })
                    });

                    // Hide modal
                    harvestModal?.classList.add('hidden');
                    harvestModal?.classList.remove('flex');

                    // Success alert with SweetAlert2
                    Swal.fire({
                        title: 'Panen Berhasil Dicatat!',
                        text: 'Histori panen Anda telah disimpan dan status lahan telah di-reset untuk siklus berikutnya.',
                        icon: 'success',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#2D4B3F'
                    }).then(() => {
                        window.location.reload();
                    });

                } catch (err) {
                    App.toast(err.message || 'Gagal menyimpan catatan panen', 'error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Catat Panen & Reset';
                    }
                }
            });
        }
    };