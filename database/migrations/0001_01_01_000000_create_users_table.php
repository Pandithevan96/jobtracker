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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone', 20)->nullable();
            $table->tinyInteger('gender')->unsigned()->nullable()->comment('1-Male, 2-Female, 3-Other');
            $table->string('password');
            $table->unsignedBigInteger('role_id')->nullable()->comment('FK to role table (added after role migration)');
            $table->tinyInteger('status')->unsigned()->default(1)->index()->comment('1-Active, 2-Inactive, 3-Password Unchanged, 4-Suspended, 5-Deleted');
            $table->tinyInteger('preferred_language')->unsigned()->default(1)->comment('1-English, 2-Tamil');
            $table->tinyInteger('plan')->unsigned()->default(1)->comment('1-Free, 2-Factory, 3-Industrial');
            $table->string('subscription_id')->nullable();
            $table->string('razorpay_customer_id')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};