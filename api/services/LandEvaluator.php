<?php
/**
 * TerraSense Agri — Land Suitability Evaluation Service
 * Implements Liebig's Law of the Minimum (Balittanah 2003)
 */

class LandEvaluator {
    public const CLASS_RANKS = [
        'S1' => 1,
        'S2' => 2,
        'S3' => 3,
        'N'  => 4,
    ];

    public const CLASS_SCORES = [
        'S1' => 100,
        'S2' => 70,
        'S3' => 40,
        'N'  => 0,
    ];

    public const CLASS_NAMES = [
        'S1' => 'Sangat Sesuai',
        'S2' => 'Cukup Sesuai',
        'S3' => 'Sesuai Marginal',
        'N'  => 'Tidak Sesuai',
    ];

    public const ALLOWED_TEXTURES = [
        'halus',
        'agak_halus',
        'sedang',
        'agak_kasar',
        'kasar',
    ];

    public const PARAM_LABELS = [
        'temperatur'  => 'Temperatur',
        'curah_hujan' => 'Curah Hujan',
        'lereng'      => 'Lereng',
        'tekstur'     => 'Tekstur Tanah',
    ];

    /**
     * Parse numeric input from payload or return null.
     */
    public static function numericInput(array $input, string $key): ?float {
        if (!isset($input[$key]) || !is_numeric($input[$key])) return null;
        return (float) $input[$key];
    }

    /**
     * Validate input parameters.
     * Returns array with sanitized values or throws InvalidArgumentException.
     */
    public static function validateInput(array $input): array {
        $area_ha     = self::numericInput($input, 'area_ha');
        $temperature = self::numericInput($input, 'temperature');
        $elevation   = self::numericInput($input, 'elevation');
        $rainfall    = self::numericInput($input, 'rainfall');
        $slope       = self::numericInput($input, 'slope');

        $texture = isset($input['texture']) ? strtolower(trim((string) $input['texture'])) : null;
        if ($texture === '') $texture = null;

        if ($area_ha === null || $area_ha <= 0) {
            throw new InvalidArgumentException('Luas lahan (area_ha) harus lebih dari 0');
        }
        if ($temperature === null || $temperature < -10 || $temperature > 50) {
            throw new InvalidArgumentException('Data suhu (temperature) wajib diisi dan harus wajar (-10 s/d 50 °C)');
        }
        if ($rainfall !== null && $rainfall < 0) {
            throw new InvalidArgumentException('Curah hujan tidak boleh negatif');
        }
        if ($slope !== null && ($slope < 0 || $slope > 100)) {
            throw new InvalidArgumentException('Kemiringan lereng harus 0 - 100%');
        }
        if ($texture !== null && !in_array($texture, self::ALLOWED_TEXTURES, true)) {
            throw new InvalidArgumentException('Tekstur tanah tidak valid');
        }

        return [
            'area_ha'     => $area_ha,
            'temperature' => $temperature,
            'elevation'   => $elevation,
            'rainfall'    => $rainfall,
            'slope'       => $slope,
            'texture'     => $texture,
            'farm_id'     => isset($input['farm_id']) ? (int) $input['farm_id'] : null,
        ];
    }

    /**
     * Determine regional soil type and agronomy advice by elevation.
     */
    public static function getRegionalAssumptions(?float $elevation): array {
        $elevationValue = $elevation ?? 0;
        if ($elevationValue > 800) {
            return [
                'soil_type' => 'Andosol',
                'note'      => 'Tanah vulkanik subur, bahan organik tinggi. Cocok untuk hortikultura dan perkebunan dataran tinggi.',
            ];
        }
        if ($elevationValue >= 400) {
            return [
                'soil_type' => 'Latosol / Andosol Transisi',
                'note'      => 'Ideal untuk Ubi Cilembu; membutuhkan Kalium tinggi (KCl), hindari kelebihan Nitrogen.',
            ];
        }
        return [
            'soil_type' => 'Aluvial / Regosol',
            'note'      => 'Ideal untuk Padi dan Mangga Gedong Gincu; perlu irigasi intensif.',
        ];
    }

    /**
     * Load commodity requirements and fertilizer standards from DB.
     */
    public static function loadAgronomyData(PDO $db): array {
        $komoditasList = $db->query('SELECT * FROM komoditas ORDER BY kelompok, nama_komoditas')->fetchAll();

        $syaratByKomoditas = [];
        foreach ($db->query('SELECT * FROM syarat_tumbuh')->fetchAll() as $row) {
            $syaratByKomoditas[$row['id_komoditas']][$row['parameter']][] = $row;
        }

        $pupukByKomoditas = [];
        foreach ($db->query('SELECT * FROM pupuk_standar ORDER BY id_pupuk')->fetchAll() as $row) {
            $pupukByKomoditas[$row['id_komoditas']][] = $row;
        }

        return [$komoditasList, $syaratByKomoditas, $pupukByKomoditas];
    }

    /**
     * Classify one parameter against criteria requirements: S1 → S2 → S3, else N.
     */
    public static function classifyParameter(array $criteria, mixed $value): string {
        foreach (['S1', 'S2', 'S3'] as $class) {
            foreach ($criteria as $req) {
                if ($req['kelas_kesesuaian'] !== $class) continue;

                if (is_string($value)) {
                    if ($req['val_text'] === null) continue;
                    $allowed = array_map('trim', explode(',', strtolower($req['val_text'])));
                    if (in_array($value, $allowed, true)) return $class;
                } else {
                    if ($req['val_min'] === null || $req['val_max'] === null) continue;
                    if ($value >= $req['val_min'] && $value <= $req['val_max']) return $class;
                }
            }
        }
        return 'N';
    }

    /**
     * Calculate fertilizer requirements scaled to measured land area.
     */
    public static function calculateFertilizers(array $fertilizers, float $areaHa): array {
        $dosisPupuk = [];
        foreach ($fertilizers as $pupuk) {
            $total = $pupuk['dosis_per_ha'] * $areaHa;
            $formatted = $total < 10
                ? number_format($total, 1, ',', '.')
                : number_format(round($total), 0, ',', '.');

            $dosisPupuk[] = [
                'fase'            => $pupuk['fase_tanam'],
                'nama_pupuk'      => $pupuk['nama_pupuk'],
                'dosis_per_ha'    => (float) $pupuk['dosis_per_ha'],
                'satuan'          => $pupuk['satuan'],
                'total'           => round($total, 2),
                'kebutuhan_total' => $formatted . ' ' . $pupuk['satuan'],
                'catatan'         => $pupuk['catatan_agronomi'] ?? null,
            ];
        }
        return $dosisPupuk;
    }

    /**
     * Save top evaluations for a farm to database.
     */
    public static function saveTopEvaluations(PDO $db, int $farmId, int $userId, array $results, int $limit = 3): int {
        $stmt = $db->prepare('SELECT id FROM farms WHERE id = ? AND user_id = ?');
        $stmt->execute([$farmId, $userId]);
        if (!$stmt->fetch()) {
            return 0;
        }

        $savedCount = 0;
        try {
            $db->beginTransaction();
            // Reset existing evaluations for this farm
            $db->prepare('DELETE FROM evaluations WHERE id_farm = ?')->execute([$farmId]);

            $stmt = $db->prepare('
                INSERT INTO evaluations (id_farm, id_komoditas, kelas_akhir, faktor_pembatas, skor_kecocokan)
                VALUES (?, ?, ?, ?, ?)
            ');

            foreach (array_slice($results, 0, $limit) as $res) {
                $stmt->execute([
                    $farmId,
                    $res['id_komoditas'],
                    $res['kelas_kesesuaian'],
                    $res['faktor_pembatas'] ? implode(', ', $res['faktor_pembatas']) : null,
                    $res['skor_kecocokan'],
                ]);
                $savedCount++;
            }
            $db->commit();
        } catch (PDOException $e) {
            if ($db->inTransaction()) $db->rollBack();
            logError('evaluate - save evaluations', $e);
            return 0;
        }

        return $savedCount;
    }

    /**
     * Run full evaluation pipeline.
     */
    public static function evaluate(array $input, int $userId): array {
        $validated = self::validateInput($input);

        $area_ha     = $validated['area_ha'];
        $temperature = $validated['temperature'];
        $elevation   = $validated['elevation'];
        $rainfall    = $validated['rainfall'];
        $slope       = $validated['slope'];
        $texture     = $validated['texture'];
        $farm_id     = $validated['farm_id'];

        $landValues = [
            'temperatur'  => $temperature,
            'curah_hujan' => $rainfall,
            'lereng'      => $slope,
            'tekstur'     => $texture,
        ];

        $regional = self::getRegionalAssumptions($elevation);

        $db = getDB();
        [$komoditasList, $syaratByKomoditas, $pupukByKomoditas] = self::loadAgronomyData($db);

        if (empty($komoditasList)) {
            throw new RuntimeException('Data komoditas belum tersedia. Jalankan seeder data terlebih dahulu.');
        }

        $results = [];

        foreach ($komoditasList as $komoditas) {
            $id_komoditas = $komoditas['id_komoditas'];
            $params       = $syaratByKomoditas[$id_komoditas] ?? [];

            // 1. Evaluate each parameter present in land values
            $detail = [];
            foreach ($params as $param_name => $criteria) {
                $value = $landValues[$param_name] ?? null;
                if ($value === null) continue;

                $param_class   = self::classifyParameter($criteria, $value);
                $kode_kriteria = $criteria[0]['kode_kriteria'] ?? '';

                $detail[] = [
                    'parameter'     => $param_name,
                    'kode_kriteria' => $kode_kriteria,
                    'label'         => (self::PARAM_LABELS[$param_name] ?? $param_name) . ($kode_kriteria ? " ($kode_kriteria)" : ''),
                    'nilai'         => $value,
                    'kelas'         => $param_class,
                    'nama_kelas'    => self::CLASS_NAMES[$param_class],
                ];
            }

            // 2. Liebig's Law of the Minimum: final class = most severe class
            $s_final = 'S1';
            if (!empty($detail)) {
                foreach ($detail as $d) {
                    if (self::CLASS_RANKS[$d['kelas']] > self::CLASS_RANKS[$s_final]) {
                        $s_final = $d['kelas'];
                    }
                }
            } else {
                $s_final = 'N';
            }

            // 3. Primary limiting factors: parameters matching lowest class
            $faktor_pembatas = [];
            $limiting_codes  = [];
            if ($s_final !== 'S1') {
                foreach ($detail as $d) {
                    if ($d['kelas'] === $s_final) {
                        $faktor_pembatas[] = $d['label'];
                        if (!empty($d['kode_kriteria'])) {
                            $limiting_codes[] = $d['kode_kriteria'];
                        }
                    }
                }
            }

            // 4. Secondary limiting factors: parameters worse than S1, but above s_final
            $faktor_sekunder = [];
            foreach ($detail as $d) {
                if ($d['kelas'] !== 'S1' && $d['kelas'] !== $s_final) {
                    $faktor_sekunder[] = $d['label'] . ' (' . $d['kelas'] . ')';
                }
            }

            // Balittanah Subclass Notation (e.g. S2-wa, S3-eh, N-tc)
            $subkelas = $s_final;
            if (!empty($limiting_codes)) {
                $subkelas .= '-' . implode(',', array_unique($limiting_codes));
            }

            // 5. Fertilizer requirements
            $dosis_pupuk = self::calculateFertilizers($pupukByKomoditas[$id_komoditas] ?? [], $area_ha);

            $results[] = [
                'id_komoditas'      => (int) $komoditas['id_komoditas'],
                'nama_komoditas'    => $komoditas['nama_komoditas'],
                'nama_latin'        => $komoditas['nama_latin'],
                'icon'              => $komoditas['icon_emoji'],
                'kelompok'          => $komoditas['kelompok'],
                'kelas_kesesuaian'  => $s_final,
                'subkelas'          => $subkelas,
                'nama_kelas'        => self::CLASS_NAMES[$s_final],
                'skor_kecocokan'    => self::CLASS_SCORES[$s_final],
                'faktor_pembatas'   => $faktor_pembatas ?: null,
                'faktor_sekunder'   => $faktor_sekunder ?: null,
                'detail_parameter'  => $detail,
                'rekomendasi_pupuk' => $dosis_pupuk,
                'deskripsi'         => $komoditas['deskripsi_umum'] ?? null,
            ];
        }

        // Sort: S1 -> S2 -> S3 -> N; then fewest limiting factors
        usort($results, function ($a, $b) {
            $rankDiff = self::CLASS_RANKS[$a['kelas_kesesuaian']] <=> self::CLASS_RANKS[$b['kelas_kesesuaian']];
            if ($rankDiff !== 0) return $rankDiff;
            return count($a['faktor_pembatas'] ?? []) <=> count($b['faktor_pembatas'] ?? []);
        });

        // Save top 3 if farm_id is provided
        $savedCount = 0;
        if (!empty($farm_id)) {
            $savedCount = self::saveTopEvaluations($db, $farm_id, $userId, $results, 3);
        }

        return [
            'success'              => true,
            'input_params'         => $validated,
            'parameter_dievaluasi' => array_keys(array_filter($landValues, fn($v) => $v !== null)),
            'regional_assumptions' => $regional,
            'total_evaluated'      => count($results),
            'saved_to_db'          => $savedCount,
            'evaluations'          => $results,
        ];
    }
}
