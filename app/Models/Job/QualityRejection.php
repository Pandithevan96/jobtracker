<?php

namespace App\Models\Job;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * QualityRejection Model
 * --------------------------------------------------------------------------------
 * Tracks rejected/scrap pieces, reworks, and short supplies for Job Orders.
 *
 * @package App\Models\Job
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class QualityRejection extends Model
{
    use HasFactory;

    // Rejection type constants
    const TYPE_SCRAP        = 1;
    const TYPE_REWORK       = 2;
    const TYPE_SHORT_SUPPLY = 3;

    // Status constants
    const STATUS_OPEN             = 1;
    const STATUS_ACKNOWLEDGED     = 2;
    const STATUS_REWORK_DISPATCHED = 3;
    const STATUS_CLOSED           = 4;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'quality_rejections';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'job_order_id',
        'reported_by',
        'rejected_qty',
        'accepted_qty',
        'rejection_type',
        'rejection_reason',
        'photo_path',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'rejected_qty'   => 'decimal:2',
        'accepted_qty'   => 'decimal:2',
        'rejection_type' => 'integer',
        'status'         => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function reporter()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'reported_by');
    }
}
