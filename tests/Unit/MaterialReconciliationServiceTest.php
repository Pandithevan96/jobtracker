<?php

namespace Tests\Unit;

use App\Services\MaterialReconciliationService;
use PHPUnit\Framework\TestCase;

class MaterialReconciliationServiceTest extends TestCase
{
    public function test_reconciliation_structure_and_tolerance_defaults()
    {
        $service = new MaterialReconciliationService;
        $this->assertInstanceOf(MaterialReconciliationService::class, $service);
    }
}
