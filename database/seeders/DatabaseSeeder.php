<?php

namespace Database\Seeders;

use Database\Seeders\User\ModuleSeeder;
use Database\Seeders\User\RolePermissionSeeder;
use Database\Seeders\User\RoleSeeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            ModuleSeeder::class,
            RolePermissionSeeder::class,
            DemoSeeder::class,
        ]);
    }
}
