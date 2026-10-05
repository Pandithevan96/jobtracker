<?php

namespace Tests\Unit;

use App\Services\VendorRecommendationService;
use PHPUnit\Framework\TestCase;

class VendorRecommendationServiceTest extends TestCase
{
    public function test_recommendation_service_instantiates()
    {
        $service = new VendorRecommendationService;
        $this->assertInstanceOf(VendorRecommendationService::class, $service);
    }
}
