<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\Sku;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Sku> */
class SkuFactory extends Factory
{
    public function definition(): array
    {
        return ['item_id' => Item::factory(), 'sku_code' => fake()->unique()->bothify('sku-########'), 'tq_item_no' => fake()->unique()->bothify('tq-########'), 'tq_color_no' => '01', 'tq_size' => '00', 'is_active' => true, 'sort_order' => 1];
    }
}
