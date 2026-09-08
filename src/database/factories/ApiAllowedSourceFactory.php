<?php

namespace Database\Factories;

use App\Models\ApiAllowedSource;
use App\Models\ApiSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApiAllowedSource> */
class ApiAllowedSourceFactory extends Factory
{
    public function definition(): array
    {
        return ['api_setting_id' => ApiSetting::factory(), 'value' => fake()->unique()->ipv4()];
    }
}
