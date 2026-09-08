<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Item> */
class ItemFactory extends Factory
{
    public function definition(): array
    {
        return ['item_no' => fake()->unique()->bothify('item-########'), 'brand_id' => Brand::factory(), 'category_id' => Category::factory(), 'is_active' => true];
    }
}
