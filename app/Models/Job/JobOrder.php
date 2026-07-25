<?php

namespace App\Models\Job;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JobOrder extends Model
{
    use HasFactory;

    // Status constants
    const STATUS_DRAFT           = 1;
    const STATUS_MATERIAL_OUT    = 2;
    const STATUS_WIP             = 3;
    const STATUS_READY           = 4;
    const STATUS_DISPATCHED_BACK = 5;
    const STATUS_COMPLETED       = 6;
    const STATUS_CANCELLED       = 7;

    // Priority constants
    const PRIORITY_LOW    = 1;
    const PRIORITY_NORMAL = 2;
    const PRIORITY_HIGH   = 3;
    const PRIORITY_URGENT = 4;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'job_orders';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'vendor_id',
        'created_by',
        'order_number',
        'part_name',
        'part_number',
        'description',
        'process_type',
        'quantity_sent',
        'uom',
        'due_date',
        'status',
        'priority',
        'notes',
        'drawing_urls',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantity_sent' => 'decimal:2',
        'due_date'      => 'date',
        'status'        => 'integer',
        'priority'      => 'integer',
        'drawing_urls'  => 'array',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($jobOrder) {
            if (empty($jobOrder->order_number)) {
                $year = date('Y');
                // Get highest ID for the current year
                $latest = self::whereYear('created_at', $year)->latest('id')->first();
                $seq = $latest ? ((int)substr($latest->order_number, -5) + 1) : 1;
                $jobOrder->order_number = sprintf('JO-%s-%05d', $year, $seq);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Get the workspace associated with this job order.
     */
    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    /**
     * Get the vendor assigned to this job order.
     */
    public function vendor()
    {
        return $this->belongsTo(\App\Models\Vendor\Vendor::class, 'vendor_id');
    }

    /**
     * Get the user who created this job order.
     */
    public function creator()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'created_by');
    }

    /**
     * Get status audit logs for this job order.
     */
    public function statusLogs()
    {
        return $this->hasMany(\App\Models\Job\JobOrderStatusLog::class, 'job_order_id');
    }

    /**
     * Get notes/remarks thread for this job order.
     */
    public function orderNotes()
    {
        return $this->hasMany(\App\Models\Job\JobOrderNote::class, 'job_order_id')->orderBy('created_at', 'asc');
    }
}
