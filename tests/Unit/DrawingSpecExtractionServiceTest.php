<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\DrawingSpecExtractionService;

class DrawingSpecExtractionServiceTest extends TestCase
{
    public function test_filename_spec_extraction_fallback()
    {
        $service = new DrawingSpecExtractionService();
        $path = 'uploads/DRW_PRECISION_SHAFT_M20_TURNING_AL6061.pdf';

        $result = $service->extractSpecs($path);

        $this->assertArrayHasKey('extracted_specs', $result);
        $this->assertEquals('CNC Turning', $result['extracted_specs']['process_type']);
        $this->assertEquals('Aluminum 6061', $result['extracted_specs']['material']);
    }
}
