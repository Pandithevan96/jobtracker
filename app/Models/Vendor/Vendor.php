<?php

namespace App\Models\Vendor;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;

class Vendor extends Model
{
    use HasFactory;

    // Status constants
    const STATUS_ACTIVE    = 1;
    const STATUS_INACTIVE  = 2;
    const STATUS_SUSPENDED = 3;

    // Language constants
    const LANG_ENGLISH = 1;
    const LANG_TAMIL   = 2;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'vendors';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'workspace_id',
        'user_id',
        'shop_name',
        'contact_person',
        'phone',
        'whatsapp_number',
        'email',
        'gstin',
        'address',
        'city',
        'pincode',
        'qr_token',
        'preferred_language',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'preferred_language' => 'integer',
        'status'             => 'integer',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate a unique 64-char QR token upon creation
        static::creating(function ($vendor) {
            if (empty($vendor->qr_token)) {
                $vendor->qr_token = Str::random(64);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Get the workspace that this vendor belongs to.
     */
    public function workspace()
    {
        return $this->belongsTo(\App\Models\Workspace\Workspace::class, 'workspace_id');
    }

    /**
     * Get the user account linked to this vendor (optional).
     */
    public function user()
    {
        return $this->belongsTo(\App\Models\User\User::class, 'user_id');
    }

    /**
     * Get the job orders assigned to this vendor.
     */
    public function jobOrders()
    {
        return $this->hasMany(\App\Models\Job\JobOrder::class, 'vendor_id');
    }

    /**
     * Helper to auto-link unlinked Vendor records to user accounts and ensure workspace membership.
     * Returns array of vendor IDs belonging to this user.
     */
    public static function syncUserVendors(\App\Models\User\User $user): array
    {
        // Auto-link unlinked vendor records that match user's workspace name, email, or phone
        $ownedWorkspaceNames = \App\Models\Workspace\Workspace::where('owner_id', $user->id)
            ->pluck('name')
            ->filter()
            ->toArray();

        $matchConditions = static::whereNull('user_id')
            ->where(function ($q) use ($ownedWorkspaceNames, $user) {
                $started = false;
                if (!empty($ownedWorkspaceNames)) {
                    $q->whereIn('shop_name', $ownedWorkspaceNames);
                    $started = true;
                }
                if ($user->email) {
                    $started ? $q->orWhere('email', $user->email) : $q->where('email', $user->email);
                    $started = true;
                }
                if ($user->phone) {
                    $started ? $q->orWhere('phone', $user->phone) : $q->where('phone', $user->phone);
                }
                if (!$started) {
                    $q->whereRaw('0 = 1'); // No conditions — match nothing
                }
            });

        try {
            $matchConditions->update(['user_id' => $user->id]);
        } catch (\Throwable $e) {
            // Silently handle any DB error during auto-linking
        }

        // Collect all vendor IDs linked to this user
        $query = static::where('user_id', $user->id);
        if ($user->email) {
            $query->orWhere('email', $user->email);
        }
        if ($user->phone) {
            $query->orWhere('phone', $user->phone);
        }
        $vendorIds = $query->pluck('id')->unique()->toArray();

        return $vendorIds;
    }
}

