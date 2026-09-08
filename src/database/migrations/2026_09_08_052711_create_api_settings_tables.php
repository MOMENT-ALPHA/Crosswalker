<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false);
            $table->string('api_key_hash')->nullable();
            $table->string('key_last_four', 4)->nullable();
            $table->timestamp('key_issued_at')->nullable();
            $table->timestamps();
        });

        Schema::create('api_allowed_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('api_setting_id')->constrained()->cascadeOnDelete();
            $table->string('value', 49);
            $table->text('memo')->nullable();
            $table->timestamps();

            $table->unique(['api_setting_id', 'value']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_allowed_sources');
        Schema::dropIfExists('api_settings');
    }
};
