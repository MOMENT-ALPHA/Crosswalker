<?php

namespace Database\Factories;

use App\Models\ApiSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ApiSetting> */
class ApiSettingFactory extends Factory
{
    public function definition(): array
    {
        return ['enabled' => false];
    }
}
