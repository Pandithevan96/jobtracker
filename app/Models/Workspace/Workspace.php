<?php

namespace App\Models\Workspace;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Workspace extends Model
{
    use HasFactory;

    // Plan constants
    const PLAN_FREE       = 1;
    const PLAN_FACTORY    = 2;
    const PLAN_INDUSTRIAL = 3;

    // Status constants
    const STATUS_ACTIVE    = 1;
    const STATUS_SUSPENDED = 2;
    const STATUS_CANCELLED = 3;

    // Workspace membership pivot-role constants (workspace_users table).
    // NOTE: this is a DIFFERENT scale from User::ROLE_ADMIN/PRINCIPAL/VENDOR
    // (the user's global account role). Same numbers (1/2/3), different
    // meanings — always reference these constants for pivot 'role', never
    // a bare integer, to avoid mixing the two scales up.
    const MEMBER_ROLE_PRINCIPAL = 1;
    const MEMBER_ROLE_VENDOR    = 2;
    const MEMBER_ROLE_ADMIN     = 3;

    const MEMBER_STATUS_ACTIVE = 1;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'workspaces';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'gstin',
        'address',
        'city',
        'state',
        'pincode',
        'phone',
        'logo_path',
        'plan',
        'status',
        'dc_count_this_month',
        'dc_count_reset_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'plan'                => 'integer',
        'status'              => 'integer',
        'dc_count_this_month' => 'integer',
        'dc_count_reset_at'   => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Get the owner of the workspace.
     */
    public function owner()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'owner_id');
    }

    /**
     * Get members of this workspace.
     */
    public function members()
    {
        return $this->belongsToMany(
            \App\Models\User\User::class,
            'workspace_users',
            'workspace_id',
            'user_id'
        )->withPivot(['role', 'status'])->withTimestamps();
    }

    /**
     * Get vendors associated with this workspace.
     */
    public function vendors()
    {
        return $this->hasMany(\App\Models\Vendor\Vendor::class, 'workspace_id');
    }

    /**
     * Get job orders associated with this workspace.
     */
    public function jobOrders()
    {
        return $this->hasMany(\App\Models\Job\JobOrder::class, 'workspace_id');
    }
}