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
     */
    public static function syncUserVendors(\App\Models\User\User $user): array
    {
        $ownedWorkspaces = \App\Models\Workspace\Workspace::where('owner_id', $user->id)->get();
        $ownedNames = $ownedWorkspaces->pluck('name')->filter()->toArray();
        $ownedIds   = $ownedWorkspaces->pluck('id')->toArray();

        static::whereNull('user_id')
            ->where(function ($q) use ($ownedNames, $ownedIds, $user) {
                if (!empty($ownedNames)) {
                    $q->whereIn('shop_name', $ownedNames);
                }
                if (!empty($ownedIds)) {
                    $q->orWhereIn('target_workspace_id', $ownedIds);
                }
                if ($user->email) {
                    $q->orWhere('email', $user->email);
                }
                if ($user->phone) {
                    $q->orWhere('phone', $user->phone);
                }
            })
            ->update(['user_id' => $user->id]);

        $vendorIds = static::where('user_id', $user->id)
            ->orWhere(function ($q) use ($user) {
                if ($user->email) $q->where('email', $user->email);
                if ($user->phone) $q->orWhere('phone', $user->phone);
            })
            ->pluck('id')
            ->toArray();

        if (!empty($vendorIds)) {
            $parentWorkspaceIds = static::whereIn('id', $vendorIds)->pluck('workspace_id')->unique()->toArray();
            foreach ($parentWorkspaceIds as $pWsId) {
                $ws = \App\Models\Workspace\Workspace::find($pWsId);
                if ($ws && $ws->owner_id !== $user->id) {
                    $ws->members()->syncWithoutDetaching([
                        $user->id => [
                            'role'   => \App\Models\Workspace\Workspace::MEMBER_ROLE_VENDOR,
                            'status' => \App\Models\Workspace\Workspace::MEMBER_STATUS_ACTIVE,
                        ],
                    ]);
                }
            }
        }

        return $vendorIds;
    }
}
