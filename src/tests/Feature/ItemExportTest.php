<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Item;
use App\Models\Sku;
use App\Models\User;
use App\Services\CsvImportService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ItemExportTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_export_requires_authentication_and_valid_filters(): void
    {
        $this->getJson('/api/admin/items/export')->assertUnauthorized();
        $this->actingAs(User::factory()->create())
            ->getJson('/api/admin/items/export?status=invalid')->assertUnprocessable();
    }

    public function test_export_includes_all_filtered_items_in_list_order_and_preserves_csv_values(): void
    {
        $this->actingAs(User::factory()->create());
        $brand = Brand::factory()->create(['name' => "ブランド,\"A\"\n日本語"]);
        $category = Category::factory()->create(['name' => '=1+1']);
        $items = Item::factory()->count(12)->create([
            'brand_id' => $brand->id, 'category_id' => $category->id,
            'parent_asin' => null, 'updated_at' => '2026-01-01 00:00:00',
        ]);
        foreach ($items as $index => $item) {
            $item->update(['item_no' => sprintf('%05d', $index)]);
            Sku::factory()->for($item)->create(['tq_color_no' => '001', 'tq_size' => '', 'child_asin' => null]);
        }
        Item::factory()->create(['brand_id' => $brand->id, 'category_id' => $category->id, 'is_active' => false]);
        Item::factory()->create();
        $filters = ['keyword' => '001', 'brand_id' => $brand->id, 'category_id' => $category->id, 'filter' => 'no_child_asin'];
        $list = $this->getJson('/api/admin/items?'.http_build_query($filters + ['per_page' => 100]))->assertOk()->json('data');
        $response = $this->get('/api/admin/items/export?'.http_build_query($filters + ['page' => 2, 'per_page' => 1]))
            ->assertOk()->assertDownload('crosswalker_items.csv')
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, substr($content, 3));
        rewind($stream);
        $rows = [];
        while (($row = fgetcsv($stream, null, ',', '"', '')) !== false) {
            $rows[] = $row;
        }
        fclose($stream);

        $this->assertSame(CsvImportService::COLUMNS, array_shift($rows));
        $this->assertCount(12, $rows);
        $this->assertSame(array_column($list, 'item_no'), array_column($rows, 0));
        $this->assertSame([$category->name, $brand->name, '', '1'], array_slice($rows[0], 1, 4));
        $this->assertSame(['001', ''], array_slice($rows[0], 9, 2));
        $summary = $this->postJson('/api/admin/csv/validate', [
            'file' => UploadedFile::fake()->createWithContent('export.csv', $content),
        ])->assertOk()->assertJsonPath('error_count', 0)->assertJsonPath('unchanged_count', 12);
        $this->postJson('/api/admin/csv/import', ['validation_id' => $summary->json('validation_id')])->assertOk();
        $this->assertDatabaseCount('skus', 12);
    }

    public function test_export_respects_inactive_and_quick_filters_and_handles_no_results(): void
    {
        $this->actingAs(User::factory()->create());
        Sku::factory()->for(Item::factory()->create(['item_no' => 'active', 'parent_asin' => null]))->create();
        $inactive = Item::factory()->create(['item_no' => 'inactive', 'is_active' => false, 'parent_asin' => null]);
        Sku::factory()->for($inactive)->create(['is_active' => true]);
        Sku::factory()->for($inactive)->create(['is_active' => false]);
        Item::factory()->create(['item_no' => 'with-asin', 'is_active' => false, 'parent_asin' => 'B000000001']);
        $response = $this->get('/api/admin/items/export?status=inactive&filter=no_parent_asin')->assertOk();
        $rows = app(CsvImportService::class)->parse($response->getContent());
        $this->assertCount(2, $rows);
        $this->assertSame(['inactive', 'inactive'], array_column($rows, 'item_no'));
        $this->assertSame(['0', '0'], array_column($rows, 'item_status'));
        $this->assertSame(['1', '0'], array_column($rows, 'sku_status'));
        $summary = $this->postJson('/api/admin/csv/validate', [
            'file' => UploadedFile::fake()->createWithContent('export.csv', $response->getContent()),
        ])->assertOk()->assertJsonPath('error_count', 0)->assertJsonPath('unchanged_count', 2);
        $this->postJson('/api/admin/csv/import', ['validation_id' => $summary->json('validation_id')])->assertOk();
        $this->assertSame([true, false], $inactive->skus()->get()->pluck('is_active')->all());
        $this->getJson('/api/admin/items/export?keyword=missing')->assertUnprocessable()->assertJsonValidationErrors('export');
    }

    public function test_export_includes_all_skus_of_matched_item_even_when_only_one_sku_matches(): void
    {
        $this->actingAs(User::factory()->create());
        $item = Item::factory()->create();
        Sku::factory()->for($item)->create(['sku_code' => 'matched-sku']);
        Sku::factory()->for($item)->create(['sku_code' => 'other-sku', 'is_active' => false]);
        $content = $this->get('/api/admin/items/export?keyword=matched-sku')->assertOk()->getContent();
        $this->assertSame(['matched-sku', 'other-sku'], array_column(app(CsvImportService::class)->parse($content), 'sku_code'));
    }
}
