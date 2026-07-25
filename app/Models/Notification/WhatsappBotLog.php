<?php

namespace App\Models\Notification;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * --------------------------------------------------------------------------------
 * WhatsappBotLog Model
 * --------------------------------------------------------------------------------
 * Tracks inbound and outbound WhatsApp communication logs for status update parsing.
 *
 * @package App\Models\Notification
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-03
 * --------------------------------------------------------------------------------
 */
class WhatsappBotLog extends Model
{
    use HasFactory;

    // Direction constants
    const DIRECTION_INBOUND  = 1;
    const DIRECTION_OUTBOUND = 2;

    // Status constants
    const STATUS_RECEIVED  = 1;
    const STATUS_PROCESSED = 2;
    const STATUS_FAILED    = 3;
    const STATUS_IGNORED   = 4;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'whatsapp_bot_logs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'vendor_id',
        'job_order_id',
        'from_number',
        'to_number',
        'direction',
        'message_body',
        'wa_message_id',
        'status',
        'parsed_intent',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'direction' => 'integer',
        'status'    => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    public function vendor()
    {
        return $this->belongsTo(\App\Models\Vendor\Vendor::class, 'vendor_id');
    }

    public function jobOrder()
    {
        return $this->belongsTo(\App\Models\Job\JobOrder::class, 'job_order_id');
    }
}
