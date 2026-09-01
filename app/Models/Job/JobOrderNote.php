<?php

namespace App\Models\Job;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JobOrderNote extends Model
{
    use HasFactory;

    protected $table = 'job_order_notes';

    const ROLE_PRINCIPAL = 1;
    const ROLE_VENDOR    = 2;

    protected $fillable = [
        'job_order_id',
        'user_id',
        'note',
        'author_role',
        'attachment_url',
        'attachment_name',
        'attachment_type',
    ];

    protected $casts = [
        'author_role' => 'integer',
    ];

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'user_id');
    }
}
