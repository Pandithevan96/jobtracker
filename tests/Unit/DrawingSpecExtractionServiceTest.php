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

    public function test_l_bt_shorthand_part_name_expansion_and_clean_part_number()
    {
        $service = new DrawingSpecExtractionService();
        $path = 'uploads/L_Bt.pdf';

        $result = $service->extractSpecs($path);

        $this->assertArrayHasKey('extracted_specs', $result);
        $this->assertEquals('L-Bracket Angle Plate', $result['extracted_specs']['part_name']);
        $this->assertEquals('OB-6105-LBRKT-01', $result['extracted_specs']['part_number']);
        $this->assertStringNotContainsString('PN-D27F50', $result['extracted_specs']['part_number']);
    }

    public function test_shaft_drawing_spec_extraction()
    {
        $service = new DrawingSpecExtractionService();
        $path = 'uploads/10in2HOLE_SHAFT.pdf';

        $result = $service->extractSpecs($path);

        $this->assertArrayHasKey('extracted_specs', $result);
        $this->assertEquals('10-inch 2-Hole Cylindrical Shaft', $result['extracted_specs']['part_name']);
        $this->assertEquals('10in2HOLE SHAFT', $result['extracted_specs']['part_number']);
        $this->assertEquals('CNC Turning', $result['extracted_specs']['process_type']);
    }
}
