<?php

namespace App\Models\Job;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DelayRiskScore extends Model
{
    use HasFactory;

    protected $table = 'delay_risk_scores';

    protected $fillable = [
        'workspace_id',
        'job_order_id',
        'vendor_id',
        'risk_score',
        'risk_level',
        'delay_probability',
        'estimated_delay_days',
        'risk_factors',
        'calculated_at',
    ];

    protected $casts = [
        'risk_score'           => 'float',
        'delay_probability'    => 'float',
        'estimated_delay_days' => 'integer',
        'risk_factors'         => 'array',
        'calculated_at'        => 'datetime',
    ];

    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function vendor()
    {
        return $this->belongsTo(\App\Models\Vendor\Vendor::class, 'vendor_id');
    }
}
