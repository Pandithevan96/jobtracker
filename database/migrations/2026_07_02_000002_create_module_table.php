<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('module', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('module')->onDelete('cascade')->comment('Links to main parent module');
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('pathname')->nullable()->comment('Route path for the menu item');
            $table->string('icon')->nullable()->comment('Lucide icon name');
            $table->integer('order')->default(0)->comment('Display order in menu');
            $table->tinyInteger('status')->unsigned()->default(1)->comment('1-Active, 2-Inactive');
            $table->timestamps();

            $table->index(['parent_id', 'status', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('module');
    }
};
