<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ApiSettingSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('api_settings')->insertOrIgnore([
            'id' => 1,
            'enabled' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
