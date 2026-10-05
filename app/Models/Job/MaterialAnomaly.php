<?php

namespace App\Models\Job;

use App\Models\User\User;
use App\Models\Workspace\Workspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialAnomaly extends Model
{
    use HasFactory;

    protected $table = 'material_anomalies';

    protected $fillable = [
        'workspace_id',
        'job_order_id',
        'dispatched_qty',
        'returned_qty',
        'scrap_qty',
        'rework_qty',
        'implied_wip_qty',
        'variance_qty',
        'variance_pct',
        'status',
        'resolved',
        'resolution_notes',
        'resolved_by',
        'resolved_at',
        'detected_at',
    ];

    protected $casts = [
        'dispatched_qty' => 'decimal:2',
        'returned_qty' => 'decimal:2',
        'scrap_qty' => 'decimal:2',
        'rework_qty' => 'decimal:2',
        'implied_wip_qty' => 'decimal:2',
        'variance_qty' => 'decimal:2',
        'variance_pct' => 'decimal:2',
        'resolved' => 'boolean',
        'resolved_at' => 'datetime',
        'detected_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function workspace()
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
