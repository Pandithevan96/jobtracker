<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Models\Job\JobOrder;
use App\Services\DelayRiskPredictionService;

class DelayRiskPredictionServiceTest extends TestCase
{
    public function test_completed_job_returns_zero_risk()
    {
        $service = new DelayRiskPredictionService();
        $job = new JobOrder([
            'id' => 101,
            'workspace_id' => 1,
            'status' => JobOrder::STATUS_COMPLETED,
        ]);

        $result = $service->calculateJobRisk($job);

        $this->assertEquals(0.0, $result['risk_score']);
        $this->assertEquals('low', $result['risk_level']);
    }
}
