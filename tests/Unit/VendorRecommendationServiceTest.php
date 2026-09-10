<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\VendorRecommendationService;

class VendorRecommendationServiceTest extends TestCase
{
    public function test_recommendation_service_instantiates()
    {
        $service = new VendorRecommendationService();
        $this->assertInstanceOf(VendorRecommendationService::class, $service);
    }
}
