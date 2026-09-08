<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('memo');
        });

        Schema::table('skus', function (Blueprint $table) {
            $table->dropColumn('memo');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->text('memo')->nullable();
        });

        Schema::table('skus', function (Blueprint $table) {
            $table->text('memo')->nullable();
        });
    }
};
