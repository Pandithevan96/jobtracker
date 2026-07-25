<?php

namespace App\Models\Challan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * ChallanItem Model
 * --------------------------------------------------------------------------------
 * Represents a line item in a Delivery Challan.
 * Each item is a specific material/part with quantity and HSN code.
 *
 * @package App\Models\Challan
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class ChallanItem extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'challan_items';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'challan_id',
        'part_name',
        'part_number',
        'hsn_code',
        'quantity',
        'uom',
        'unit_value',
        'total_value',
        'description',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity'    => 'decimal:2',
        'unit_value'  => 'decimal:2',
        'total_value' => 'decimal:2',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function challan()
    {
        return $this->belongsTo(DeliveryChallan::class, 'challan_id');
    }
}
