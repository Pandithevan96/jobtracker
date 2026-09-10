<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Models\Job\QualityRejection;
use App\Services\RejectionClassificationService;

class RejectionClassificationServiceTest extends TestCase
{
    public function test_heuristic_scrap_classification()
    {
        $service = new RejectionClassificationService();
        $rejection = new QualityRejection([
            'rejection_reason' => 'Deep crack in casting core body',
            'rejection_type'   => 1,
        ]);

        $result = $service->classify($rejection);

        $this->assertEquals('scrap', $result['ai_suggested_category']);
        $this->assertGreaterThanOrEqual(80.0, $result['ai_confidence']);
    }

    public function test_heuristic_rework_classification()
    {
        $service = new RejectionClassificationService();
        $rejection = new QualityRejection([
            'rejection_reason' => 'Excess burrs on flange surface',
            'rejection_type'   => 2,
        ]);

        $result = $service->classify($rejection);

        $this->assertEquals('rework', $result['ai_suggested_category']);
    }
}
