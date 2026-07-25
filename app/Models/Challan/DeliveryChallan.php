<?php

namespace App\Models\Challan;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * DeliveryChallan Model
 * --------------------------------------------------------------------------------
 * Represents a GST Delivery Challan (DC) issued from Principal to Vendor for
 * job work under Section 143 / Rule 45 of GST Rules.
 *
 * @package App\Models\Challan
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class DeliveryChallan extends Model
{
    use HasFactory;

    // Challan type constants
    const TYPE_OUTWARD = 1; // Principal → Vendor (material sent for job work)
    const TYPE_INWARD  = 2; // Vendor → Principal (finished goods returned)

    // Status constants
    const STATUS_ISSUED      = 1;
    const STATUS_DISPATCHED  = 2;
    const STATUS_ACKNOWLEDGED = 3; // Vendor scanned/received
    const STATUS_COMPLETED   = 4;
    const STATUS_CANCELLED   = 5;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'delivery_challans';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'job_order_id',
        'vendor_id',
        'created_by',
        'challan_number',
        'type',
        'status',
        'vehicle_number',
        'driver_name',
        'dispatch_date',
        'estimated_delivery',
        'acknowledged_at',
        'acknowledged_by',
        'qr_code',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'type'               => 'integer',
        'status'             => 'integer',
        'dispatch_date'      => 'date',
        'estimated_delivery' => 'date',
        'acknowledged_at'    => 'datetime',
    ];

    /**
     * Boot the model — auto-generate challan_number and QR code.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($challan) {
            if (empty($challan->challan_number)) {
                $month = date('Ym');
                $latest = self::whereYear('created_at', date('Y'))
                    ->whereMonth('created_at', date('m'))
                    ->latest('id')
                    ->first();
                $seq = $latest ? ((int) substr($latest->challan_number, -4) + 1) : 1;
                $challan->challan_number = sprintf('DC-%s-%04d', $month, $seq);
            }

            if (empty($challan->qr_code)) {
                $challan->qr_code = 'QR-' . strtoupper(bin2hex(random_bytes(8)));
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    public function jobOrder()
    {
        return $this->belongsTo(\App\Models\Job\JobOrder::class, 'job_order_id');
    }

    public function vendor()
    {
        return $this->belongsTo(\App\Models\Vendor\Vendor::class, 'vendor_id');
    }

    public function creator()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'created_by');
    }

    public function acknowledgedBy()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'acknowledged_by');
    }

    public function items()
    {
        return $this->hasMany(ChallanItem::class, 'challan_id');
    }
}
