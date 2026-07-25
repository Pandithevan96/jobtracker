<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    use HasFactory;

    // Status constants
    const STATUS_ACTIVE   = 1;
    const STATUS_INACTIVE = 2;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'role';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Relationship with users.
     */
    public function users()
    {
        return $this->hasMany(\App\Models\User\User::class, 'role_id');
    }

    /**
     * Relationship with role permissions.
     */
    public function permissions()
    {
        return $this->hasMany(\App\Models\User\RolePermission::class, 'role_id');
    }
}
