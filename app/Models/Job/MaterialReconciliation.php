<?php

namespace App\Models\Job;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * MaterialReconciliation Model
 * --------------------------------------------------------------------------------
 * Tracks material balances matching ITC-04 requirements.
 * Formulates: qty_dispatched = qty_finished_received + qty_scrap + qty_rejected + qty_shortage
 *
 * @package App\Models\Job
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class MaterialReconciliation extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'material_reconciliations';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'job_order_id',
        'reconciled_by',
        'qty_dispatched',
        'qty_finished_received',
        'qty_scrap',
        'qty_rejected',
        'qty_shortage',
        'is_balanced',
        'remarks',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'qty_dispatched'        => 'decimal:2',
        'qty_finished_received' => 'decimal:2',
        'qty_scrap'             => 'decimal:2',
        'qty_rejected'          => 'decimal:2',
        'qty_shortage'          => 'decimal:2',
        'is_balanced'           => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function reconciler()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'reconciled_by');
    }
}
