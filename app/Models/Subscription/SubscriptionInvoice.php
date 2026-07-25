<?php

namespace App\Models\Subscription;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * SubscriptionInvoice Model
 * --------------------------------------------------------------------------------
 * Manages SaaS payment history / invoices for subscriptions.
 *
 * @package App\Models\Subscription
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class SubscriptionInvoice extends Model
{
    use HasFactory;

    // Status constants
    const STATUS_PENDING  = 1;
    const STATUS_PAID     = 2;
    const STATUS_FAILED   = 3;
    const STATUS_REFUNDED = 4;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'subscription_invoices';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'subscription_id',
        'razorpay_invoice_id',
        'razorpay_payment_id',
        'amount',
        'status',
        'plan',
        'paid_at',
        'period_start',
        'period_end',
        'razorpay_payload',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount'           => 'decimal:2',
        'status'           => 'integer',
        'plan'             => 'integer',
        'paid_at'          => 'datetime',
        'period_start'     => 'datetime',
        'period_end'       => 'datetime',
        'razorpay_payload' => 'array',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class, 'subscription_id');
    }
}
