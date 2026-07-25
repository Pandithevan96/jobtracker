<?php

namespace App\Models\Subscription;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * Subscription Model
 * --------------------------------------------------------------------------------
 * Manages SaaS subscriptions for workspaces.
 *
 * @package App\Models\Subscription
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class Subscription extends Model
{
    use HasFactory;

    // Status constants
    const STATUS_ACTIVE    = 1;
    const STATUS_HALTED    = 2;
    const STATUS_CANCELLED = 3;
    const STATUS_EXPIRED   = 4;
    const STATUS_PENDING   = 5;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'subscriptions';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'razorpay_subscription_id',
        'razorpay_plan_id',
        'plan',
        'status',
        'current_period_start',
        'current_period_end',
        'trial_ends_at',
        'cancelled_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'plan'                 => 'integer',
        'status'               => 'integer',
        'current_period_start' => 'datetime',
        'current_period_end'   => 'datetime',
        'trial_ends_at'        => 'datetime',
        'cancelled_at'         => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    public function invoices()
    {
        return $this->hasMany(SubscriptionInvoice::class, 'subscription_id');
    }
}
