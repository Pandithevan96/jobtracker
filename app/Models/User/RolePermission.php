<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'role_permission';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'role_id',
        'module_id',
        'can_access',
        'can_view',
        'can_create',
        'can_edit',
        'can_delete',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'can_access' => 'boolean',
        'can_view'   => 'boolean',
        'can_create' => 'boolean',
        'can_edit'   => 'boolean',
        'can_delete' => 'boolean',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    /**
     * Relationship with role.
     */
    public function role()
    {
        return $this->belongsTo(\App\Models\User\Role::class, 'role_id');
    }

    /**
     * Relationship with module.
     */
    public function module()
    {
        return $this->belongsTo(\App\Models\User\Module::class, 'module_id');
    }
}
