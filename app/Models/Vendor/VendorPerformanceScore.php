<?php

namespace App\Models\Vendor;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VendorPerformanceScore extends Model
{
    use HasFactory;

    protected $table = 'vendor_performance_scores';

    protected $fillable = [
        'workspace_id',
        'vendor_id',
        'overall_score',
        'on_time_delivery_score',
        'quality_yield_score',
        'capacity_utilization_score',
        'process_type_breakdown',
        'total_jobs_completed',
        'calculated_at',
    ];

    protected $casts = [
        'overall_score'              => 'float',
        'on_time_delivery_score'     => 'float',
        'quality_yield_score'        => 'float',
        'capacity_utilization_score' => 'float',
        'process_type_breakdown'     => 'array',
        'total_jobs_completed'       => 'integer',
        'calculated_at'              => 'datetime',
    ];

    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }
}
