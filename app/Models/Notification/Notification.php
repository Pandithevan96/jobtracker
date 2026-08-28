<?php

namespace App\Models\Notification;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * Notification Model
 * --------------------------------------------------------------------------------
 * Handles multi-channel alerts (WhatsApp, SMS, Email, Push) for Job Orders.
 *
 * @package App\Models\Notification
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class Notification extends Model
{
    use HasFactory;

    // Channel constants
    const CHANNEL_WHATSAPP = 1;
    const CHANNEL_SMS      = 2;
    const CHANNEL_EMAIL    = 3;
    const CHANNEL_PUSH     = 4;

    // Type constants
    const TYPE_DELAY_ALERT     = 1;
    const TYPE_STATUS_UPDATE   = 2;
    const TYPE_DC_GENERATED    = 3;
    const TYPE_REJECTION_ALERT = 4;
    const TYPE_GENERAL         = 5;
    const TYPE_JOB_CREATED     = 6;

    // Status constants
    const STATUS_PENDING   = 1;
    const STATUS_SENT      = 2;
    const STATUS_FAILED    = 3;
    const STATUS_DELIVERED = 4;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'notifications';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'job_order_id',
        'vendor_id',
        'user_id',
        'channel',
        'type',
        'recipient_number',
        'recipient_email',
        'message',
        'status',
        'error_message',
        'sent_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'channel' => 'integer',
        'type'    => 'integer',
        'status'  => 'integer',
        'sent_at' => 'datetime',
    ];

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

    public function user()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'user_id');
    }
}
