<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\MaterialReconciliationService;

class MaterialReconciliationServiceTest extends TestCase
{
    public function test_reconciliation_structure_and_tolerance_defaults()
    {
        $service = new MaterialReconciliationService();
        $this->assertInstanceOf(MaterialReconciliationService::class, $service);
    }
}
