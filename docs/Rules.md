# SCIENTIFIC LOGIC & AI CODING RULES
**Project Name:** TerraSense Agri  
**Target Engine:** PHP Native / JavaScript Hybrid  
**Scientific Reference:** Petunjuk Teknis Evaluasi Lahan Untuk Komoditas Pertanian (Balai Penelitian Tanah, 2003).

## 1. Strict AI Vibe-Coding Rules
* **NO PLACEHOLDERS:** You are strictly forbidden from generating incomplete code, partial snippets, or comments like `// ... rest of implementation` or `// TODO: add database logic`. Output production-ready, fully functional blocks.
* **TYPE SAFETY & VALIDATION:** Always validate input payloads in PHP (`isset()`, `json_decode()`, type casting to `float` or `int`). In JavaScript, ensure DOM elements exist before attaching event listeners.
* **ZERO PAID APIS:** Do not reference Google Maps API, Google Elevation API, or Mapbox commercial tokens. Stick strictly to Leaflet, Esri Imagery, Open-Meteo, and Turf.js.

## 2. The Expert System Algorithm: "Law of Minimum" (Hukum Minimum)
When writing the evaluation logic in `/api/evaluate.php` or `evaluatorEngine.js`, you MUST implement the **Law of Minimum (Hukum Minimum)** as mandated by the Indonesian Soil Research Institute:
1. **Parameter Evaluation:** For a given crop $C$, evaluate each environmental parameter $P_i$ (e.g., temperature, rainfall, drainage, texture, slope, soil depth, flood hazard) against its defined requirement range in the database.
2. **Class Assignment per Parameter:** Assign a class ($S_1$, $S_2$, $S_3$, or $N$) to each individual parameter $P_i$.
3. **The Minimum Rule:** The final suitability class $S_{final}$ for crop $C$ on that farmland is determined strictly by the **LOWEST (most severe)** class among all its evaluated parameters.
   $$\text{If any } P_i = N \implies S_{final} = N \text{ (Tidak Sesuai)}$$
   $$\text{Else if any } P_i = S_3 \implies S_{final} = S_3 \text{ (Sesuai Marginal)}$$
   $$\text{Else if any } P_i = S_2 \implies S_{final} = S_2 \text{ (Cukup Sesuai)}$$
   $$\text{Else } \implies S_{final} = S_1 \text{ (Sangat Sesuai)}$$
4. **Limiting Factor Identification (Subkelas):** If $S_{final}$ is $S_2$, $S_3$, or $N$, the engine MUST capture and attach the specific name(s) of the lowest parameter(s) as the **Faktor Pembatas** (e.g., if Texture caused an $S_3$ rating, return `{"class": "S3", "limiting_factor": "Tekstur Tanah (rc)"}`).

## 3. Fertilizer Dosage Dynamic Math
Do not display static fertilizer numbers. Always calculate customized dosages based on the exact land area calculated by Turf.js:
$$\text{Total Kebutuhan Pupuk (kg)} = \text{Dosis Standar (kg/Ha)} \times \text{Luas Lahan Terhitung (Ha)}$$
Round the result to 1 decimal place if $< 10\text{ kg}$, or to integer using local number formatting (`1.250 kg`) if $\ge 10\text{ kg}$.

## 4. Regional Sumedang Default Assumptions
If specific chemical soil tests are unavailable, apply these regional agro-climatic defaults for Kabupaten Sumedang, West Java:
* Elevation $> 800\text{ MDPL}$ $\implies$ Soil Type = Andosol (Volcanic, fertile, high organic matter).
* Elevation $400 - 800\text{ MDPL}$ $\implies$ Soil Type = Latosol / Andosol Transition (Ideal for Ubi Cilembu; requires High-Potassium / KCl, avoid excess Nitrogen).
* Elevation $< 400\text{ MDPL}$ $\implies$ Soil Type = Aluvial / Regosol (Ideal for Rice and Mango Gedong Gincu; intensive irrigation required).