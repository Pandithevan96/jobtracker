<?php

namespace App\Models\Job;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobOrderStatusLog extends Model
{
    use HasFactory;

    // Channel constants ("changed_via")
    const VIA_WEB       = 1;
    const VIA_PWA       = 2;
    const VIA_WHATSAPP  = 3;
    const VIA_QR        = 4;

    protected $table = 'job_order_status_logs';

    protected $fillable = [
        'job_order_id',
        'changed_by',
        'from_status',
        'to_status',
        'changed_via',
        'photo_proof_path',
        'notes',
    ];

    protected $casts = [
        'from_status' => 'integer',
        'to_status'   => 'integer',
        'changed_via' => 'integer',
    ];

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'changed_by');
    }
}