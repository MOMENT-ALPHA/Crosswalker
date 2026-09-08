<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('login_id')->nullable()->unique();
            $table->string('email')->nullable()->change();
        });
        DB::table('users')->orderBy('id')->each(function (object $user) {
            DB::table('users')->where('id', $user->id)->update(['login_id' => $user->email]);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->string('login_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        // Accounts created without email remain valid after rollback.
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('login_id');
        });
    }
};
