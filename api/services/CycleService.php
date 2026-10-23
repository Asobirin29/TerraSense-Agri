<?php
// ============================================
// TerraSense Agri — Planting Cycle Service
// ============================================
// Shared logic for planting_cycles (musim tanam) used by cycles.php,
// activities.php, harvests.php and farms.php. farms.crop_id / planting_date /
// is_fertilized are kept in sync as a cache of the active cycle.
// ============================================

class CycleService
{
    public const DEFAULT_HARVEST_DAYS = 100;

    /** Farm row owned by the user, or null. */
    public static function findFarm(PDO $db, int $farmId, int $userId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM farms WHERE id = ? AND user_id = ?');
        $stmt->execute([$farmId, $userId]);
        return $stmt->fetch() ?: null;
    }

    /** Cycle row owned by the user, or null. */
    public static function findCycle(PDO $db, int $cycleId, int $userId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM planting_cycles WHERE id = ? AND user_id = ?');
        $stmt->execute([$cycleId, $userId]);
        return $stmt->fetch() ?: null;
    }

    public static function getActiveCycle(PDO $db, int $farmId): ?array
    {
        $stmt = $db->prepare("SELECT * FROM planting_cycles WHERE farm_id = ? AND status = 'aktif' ORDER BY id DESC LIMIT 1");
        $stmt->execute([$farmId]);
        return $stmt->fetch() ?: null;
    }

    /** Totals for one cycle: fertilizer per name+unit, cost, last fertilizing & activity count. */
    public static function summarize(PDO $db, array $cycle): array
    {
        $stmt = $db->prepare("
            SELECT fertilizer_name, unit, SUM(amount) AS total
            FROM farm_activities
            WHERE cycle_id = ? AND type = 'pupuk'
            GROUP BY fertilizer_name, unit
            ORDER BY fertilizer_name
        ");
        $stmt->execute([$cycle['id']]);
        $fertilizers = array_map(fn($r) => [
            'name'  => $r['fertilizer_name'],
            'unit'  => $r['unit'],
            'total' => (float) $r['total'],
        ], $stmt->fetchAll());

        $stmt = $db->prepare('SELECT COUNT(*) AS n, COALESCE(SUM(cost), 0) AS cost FROM farm_activities WHERE cycle_id = ?');
        $stmt->execute([$cycle['id']]);
        $agg = $stmt->fetch();

        $stmt = $db->prepare("SELECT * FROM farm_activities WHERE cycle_id = ? AND type = 'pupuk' ORDER BY activity_date DESC, id DESC LIMIT 1");
        $stmt->execute([$cycle['id']]);

        return [
            'activity_count'   => (int) $agg['n'],
            'activity_cost'    => (float) $agg['cost'],
            'total_cost'       => (float) $agg['cost'] + (float) ($cycle['seed_cost'] ?? 0),
            'fertilizers'      => $fertilizers,
            'last_fertilizing' => $stmt->fetch() ?: null,
        ];
    }

    /** Validate a Y-m-d date string. */
    public static function validDate(?string $date): bool
    {
        if (!$date) return false;
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    /**
     * Insert a new active cycle and update the farm cache.
     * Caller must have checked there is no active cycle yet.
     */
    public static function start(PDO $db, array $farm, array $data): int
    {
        $stmt = $db->prepare('
            INSERT INTO planting_cycles (farm_id, user_id, komoditas_id, crop_name, planting_date, expected_harvest_days, area_ha, seed_cost, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $farm['id'], $farm['user_id'],
            $data['komoditas_id'] ?? null,
            $data['crop_name'],
            $data['planting_date'],
            $data['expected_harvest_days'] ?? self::DEFAULT_HARVEST_DAYS,
            $farm['area_ha'],
            $data['seed_cost'] ?? null,
            $data['notes'] ?? null,
        ]);
        $cycleId = (int) $db->lastInsertId();

        $db->prepare('UPDATE farms SET crop_id = ?, planting_date = ?, is_fertilized = 0, updated_at = NOW() WHERE id = ?')
           ->execute([$data['crop_name'], $data['planting_date'], $farm['id']]);

        return $cycleId;
    }

    /** Close the cycle ('dipanen' / 'gagal') and clear the farm cache. */
    public static function close(PDO $db, int $cycleId, int $farmId, string $status, string $endedAt): void
    {
        $db->prepare('UPDATE planting_cycles SET status = ?, ended_at = ? WHERE id = ?')
           ->execute([$status, $endedAt, $cycleId]);
        $db->prepare('UPDATE farms SET crop_id = NULL, planting_date = NULL, is_fertilized = 0, updated_at = NOW() WHERE id = ?')
           ->execute([$farmId]);
    }

    /**
     * Keep the active cycle in line with crop/planting date entered through the
     * farm form (farms.php save/update). Clearing the crop there leaves the cycle alone.
     */
    public static function syncFromFarm(PDO $db, int $farmId): void
    {
        $stmt = $db->prepare('SELECT * FROM farms WHERE id = ?');
        $stmt->execute([$farmId]);
        $farm = $stmt->fetch();
        if (!$farm || empty($farm['crop_id']) || empty($farm['planting_date'])) return;

        $active = self::getActiveCycle($db, $farmId);
        if ($active) {
            $db->prepare('UPDATE planting_cycles SET crop_name = ?, planting_date = ? WHERE id = ?')
               ->execute([$farm['crop_id'], $farm['planting_date'], $active['id']]);
            return;
        }
        $stmt = $db->prepare('
            INSERT INTO planting_cycles (farm_id, user_id, crop_name, planting_date, expected_harvest_days, area_ha)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$farm['id'], $farm['user_id'], $farm['crop_id'], $farm['planting_date'], self::DEFAULT_HARVEST_DAYS, $farm['area_ha']]);
    }
}
