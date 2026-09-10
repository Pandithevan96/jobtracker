<?php

namespace App\Models\Job;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DrawingExtractedSpec extends Model
{
    use HasFactory;

    protected $table = 'drawing_extracted_specs';

    protected $fillable = [
        'workspace_id',
        'job_order_id',
        'drawing_path',
        'extracted_specs',
        'confidence_scores',
        'status',
        'extracted_at',
    ];

    protected $casts = [
        'extracted_specs'   => 'array',
        'confidence_scores' => 'array',
        'extracted_at'      => 'datetime',
    ];

    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }
}
