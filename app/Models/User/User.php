<?php

namespace App\Models\User;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Passport\HasApiTokens;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // Status constants
    const STATUS_ACTIVE             = 1;
    const STATUS_INACTIVE           = 2;
    const STATUS_PASSWORD_UNCHANGED = 3;
    const STATUS_SUSPENDED          = 4;
    const STATUS_DELETED            = 5;

    // Gender constants
    const GENDER_MALE   = 1;
    const GENDER_FEMALE = 2;
    const GENDER_OTHER  = 3;

    // Role constants (matches role_id foreign key values)
    const ROLE_ADMIN     = 1;
    const ROLE_PRINCIPAL = 2;
    const ROLE_VENDOR    = 3;

    // Preferred language constants
    const LANG_ENGLISH = 1;
    const LANG_TAMIL   = 2;

    // Plan constants
    const PLAN_FREE       = 1;
    const PLAN_FACTORY    = 2;
    const PLAN_INDUSTRIAL = 3;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'gender',
        'password',
        'role_id',
        'status',
        'preferred_language',
        'plan',
        'subscription_id',
        'razorpay_customer_id',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'subscription_id',
        'razorpay_customer_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at'  => 'datetime',
        'password'           => 'hashed',
        'status'             => 'integer',
        'role_id'            => 'integer',
        'gender'             => 'integer',
        'preferred_language' => 'integer',
        'plan'               => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Factory override (model is in a sub-namespace, factory is at root)
    // -------------------------------------------------------------------------

    /**
     * Create a new factory instance for the model.
     */
    protected static function newFactory()
    {
        return UserFactory::new();
    }

    // -------------------------------------------------------------------------
    // Status Helpers
    // -------------------------------------------------------------------------

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isPasswordUnchanged(): bool
    {
        return $this->status === self::STATUS_PASSWORD_UNCHANGED;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    public function isDeleted(): bool
    {
        return $this->status === self::STATUS_DELETED;
    }

    // -------------------------------------------------------------------------
    // Role Helpers
    // -------------------------------------------------------------------------

    public function isSystemAdmin(): bool
    {
        return $this->role_id === 1;
    }

    public function isPrincipal(): bool
    {
        return $this->role_id === 2;
    }

    public function isVendor(): bool
    {
        return $this->role_id === 3;
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * The role assigned to this user.
     */
    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /**
     * Workspaces owned by this user (as principal).
     */
    public function ownedWorkspaces()
    {
        return $this->hasMany(\App\Models\Workspace\Workspace::class, 'owner_id');
    }

    /**
     * All workspaces this user belongs to (via pivot).
     */
    public function workspaces()
    {
        return $this->belongsToMany(
            \App\Models\Workspace\Workspace::class,
            'workspace_users',
            'user_id',
            'workspace_id'
        )->withPivot(['role', 'status'])->withTimestamps();
    }
}