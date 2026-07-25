<?php

use App\Models\Challan\DeliveryChallan;
use App\Models\Challan\ChallanItem;
use App\Http\Controllers\Challan\DeliveryChallanController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

// Authenticate as User ID 2 (deva, the creator of Challan #2)
Auth::loginUsingId(2);

// Setup Request Payload
$payload = [
    'id'                 => 2,
    'dispatch_date'      => '2026-07-20',
    'estimated_delivery' => '2026-07-25',
    'vehicle_number'     => 'TN 38 ZZ 9999',
    'driver_name'        => 'Mani Dev',
    'notes'              => 'Urgent delivery modified via backend test script',
    'items'              => [
        [
            'part_name'   => 'Sprocket Modified',
            'part_number' => '9890-MOD',
            'hsn_code'    => '8483',
            'quantity'    => 250.00,
            'uom'         => 'Nos',
            'unit_value'  => 150.00,
            'description' => 'Upgraded size',
        ]
    ]
];

$request = Request::create('/api/v1/challans/update', 'POST', $payload);
$request->headers->set('Accept', 'application/json');

// Execute Controller Update Method
$controller = new DeliveryChallanController();
$response = $controller->update($request);

echo "Response Status: " . $response->getStatusCode() . "\n";
echo "Response Content: " . json_encode(json_decode($response->getContent()), JSON_PRETTY_PRINT) . "\n";

// Print updated record from DB
echo "\n--- DB Record Check ---\n";
print_r(DeliveryChallan::find(2)->toArray());
echo "\n--- DB Items Check ---\n";
print_r(ChallanItem::where('challan_id', 2)->get()->toArray());
