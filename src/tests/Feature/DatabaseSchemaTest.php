<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DatabaseSchemaTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_identifiers_preserve_leading_zeros_and_optional_fields_can_be_omitted(): void
    {
        $itemId = $this->createItem(['item_no' => '00001', 'parent_asin' => '0000000001']);
        $skuId = $this->createSku($itemId, [
            'sku_code' => '00001-01-00',
            'child_asin' => '0000000002',
            'tq_item_no' => '00001',
            'tq_color_no' => '01',
            'tq_size' => '00',
        ]);

        $item = DB::table('items')->find($itemId);
        $sku = DB::table('skus')->find($skuId);

        $this->assertSame('00001', $item->item_no);
        $this->assertSame('0000000001', $item->parent_asin);
        $this->assertSame('00001-01-00', $sku->sku_code);
        $this->assertSame('0000000002', $sku->child_asin);
        $this->assertSame('00001', $sku->tq_item_no);
        $this->assertSame('01', $sku->tq_color_no);
        $this->assertSame('00', $sku->tq_size);
        $this->assertDatabaseHas('items', ['id' => $itemId, 'is_active' => true, 'name' => null]);
        $this->assertDatabaseHas('skus', ['id' => $skuId, 'is_active' => true, 'sort_order' => 1]);
    }

    public function test_items_and_skus_do_not_have_memo_columns(): void
    {
        $this->assertFalse(Schema::hasColumn('items', 'memo'));
        $this->assertFalse(Schema::hasColumn('skus', 'memo'));
    }

    public function test_multiple_skus_can_have_no_child_asin_and_items_can_share_a_parent_asin(): void
    {
        $first = $this->createItem(['parent_asin' => 'B000000001']);
        $second = $this->createItem(['parent_asin' => 'B000000001']);

        $this->createSku($first);
        $this->createSku($second);

        $this->assertDatabaseCount('items', 2);
        $this->assertDatabaseCount('skus', 2);
        $this->assertSame(2, DB::table('skus')->whereNull('child_asin')->count());
    }

    #[DataProvider('uniqueColumns')]
    public function test_duplicate_identifiers_and_master_names_are_rejected(string $table, string $column): void
    {
        $itemId = $this->createItem();
        $this->createSku($itemId, ['child_asin' => 'B000000002']);
        $original = (array) DB::table($table)->first();
        unset($original['id']);
        $original[$column] = 'duplicate';
        DB::table($table)->update([$column => 'duplicate']);

        $this->expectException(QueryException::class);

        DB::table($table)->insert($original);
    }

    public static function uniqueColumns(): array
    {
        return [
            'brand name' => ['brands', 'name'],
            'category name' => ['categories', 'name'],
            'item number' => ['items', 'item_no'],
        ];
    }

    #[DataProvider('uniqueSkuKeys')]
    public function test_sku_keys_must_be_unique_across_items(array $duplicate): void
    {
        $first = $this->createItem();
        $second = $this->createItem();
        $this->createSku($first, $duplicate);

        $this->expectException(QueryException::class);

        $this->createSku($second, $duplicate);
    }

    public static function uniqueSkuKeys(): array
    {
        return [
            'sku code' => [['sku_code' => 'same-code']],
            'child asin' => [['child_asin' => 'B000000001']],
            'tq composite key' => [['tq_item_no' => '0001', 'tq_color_no' => '01', 'tq_size' => '00']],
        ];
    }

    #[DataProvider('tqKeyComponents')]
    public function test_tq_keys_can_share_two_components(string $column): void
    {
        $itemId = $this->createItem();
        $key = ['tq_item_no' => '0001', 'tq_color_no' => '01', 'tq_size' => '00'];
        $this->createSku($itemId, $key);

        $this->createSku($itemId, array_replace($key, [$column => '02']));

        $this->assertDatabaseCount('skus', 2);
    }

    public static function tqKeyComponents(): array
    {
        return [
            'item number' => ['tq_item_no'],
            'color number' => ['tq_color_no'],
            'size' => ['tq_size'],
        ];
    }

    #[DataProvider('masterTables')]
    public function test_used_masters_cannot_be_deleted(string $table): void
    {
        $this->createItem();

        $this->expectException(QueryException::class);

        DB::table($table)->delete();
    }

    public static function masterTables(): array
    {
        return ['brand' => ['brands'], 'category' => ['categories']];
    }

    #[DataProvider('foreignKeys')]
    public function test_nonexistent_parents_are_rejected(string $table, string $column): void
    {
        $itemId = $this->createItem();
        $this->createSku($itemId);
        $settingId = DB::table('api_settings')->insertGetId([]);
        DB::table('api_allowed_sources')->insert(['api_setting_id' => $settingId, 'value' => '192.0.2.1']);

        $this->expectException(QueryException::class);

        DB::table($table)->update([$column => 999999]);
    }

    public static function foreignKeys(): array
    {
        return [
            'item brand' => ['items', 'brand_id'],
            'item category' => ['items', 'category_id'],
            'sku item' => ['skus', 'item_id'],
            'source setting' => ['api_allowed_sources', 'api_setting_id'],
        ];
    }

    public function test_deleting_an_item_removes_only_its_skus(): void
    {
        $deletedItem = $this->createItem();
        $retainedItem = $this->createItem();
        $this->createSku($deletedItem);
        $retainedSku = $this->createSku($retainedItem);

        DB::table('items')->where('id', $deletedItem)->delete();

        $this->assertDatabaseMissing('items', ['id' => $deletedItem]);
        $this->assertDatabaseMissing('skus', ['item_id' => $deletedItem]);
        $this->assertDatabaseHas('skus', ['id' => $retainedSku, 'item_id' => $retainedItem]);
        $this->assertDatabaseCount('brands', 2);
        $this->assertDatabaseCount('categories', 2);
    }

    public function test_disabling_an_item_preserves_individual_sku_states(): void
    {
        $itemId = $this->createItem();
        $active = $this->createSku($itemId);
        $inactive = $this->createSku($itemId, ['is_active' => false]);

        DB::table('items')->where('id', $itemId)->update(['is_active' => false]);

        $this->assertDatabaseHas('items', ['id' => $itemId, 'is_active' => false]);
        $this->assertDatabaseHas('skus', ['id' => $active, 'is_active' => true]);
        $this->assertDatabaseHas('skus', ['id' => $inactive, 'is_active' => false]);
    }

    public function test_api_settings_start_disabled_without_credentials_or_sample_users(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseHas('api_settings', [
            'id' => 1, 'enabled' => false, 'api_key_hash' => null,
            'key_last_four' => null, 'key_issued_at' => null,
        ]);
        $this->assertDatabaseCount('api_allowed_sources', 0);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_seeding_again_preserves_existing_api_settings(): void
    {
        $this->seed(DatabaseSeeder::class);
        DB::table('api_settings')->where('id', 1)->update(['enabled' => true, 'api_key_hash' => 'existing-hash']);
        DB::table('api_allowed_sources')->insert(['api_setting_id' => 1, 'value' => '192.0.2.1']);

        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('api_settings', 1);
        $this->assertDatabaseHas('api_settings', ['id' => 1, 'enabled' => true, 'api_key_hash' => 'existing-hash']);
        $this->assertDatabaseHas('api_allowed_sources', ['api_setting_id' => 1, 'value' => '192.0.2.1']);
    }

    public function test_allowed_sources_support_ipv4_ipv6_and_cidr_and_are_deleted_with_settings(): void
    {
        $settingId = DB::table('api_settings')->insertGetId([]);
        foreach (['192.0.2.1', '192.0.2.0/24', '2001:db8::1', 'ffff:ffff:ffff:ffff:ffff:ffff:255.255.255.255/128'] as $value) {
            DB::table('api_allowed_sources')->insert(['api_setting_id' => $settingId, 'value' => $value]);
            $this->assertDatabaseHas('api_allowed_sources', ['api_setting_id' => $settingId, 'value' => $value]);
        }

        DB::table('api_settings')->where('id', $settingId)->delete();

        $this->assertDatabaseCount('api_allowed_sources', 0);
    }

    public function test_duplicate_allowed_sources_are_rejected(): void
    {
        $settingId = DB::table('api_settings')->insertGetId([]);
        $source = ['api_setting_id' => $settingId, 'value' => '192.0.2.0/24'];
        DB::table('api_allowed_sources')->insert($source);

        $this->expectException(QueryException::class);

        DB::table('api_allowed_sources')->insert($source);
    }

    private function createItem(array $attributes = []): int
    {
        $number = DB::table('items')->count() + 1;

        return DB::table('items')->insertGetId(array_replace([
            'item_no' => 'item-'.$number,
            'brand_id' => DB::table('brands')->insertGetId(['name' => 'ブランド'.$number]),
            'category_id' => DB::table('categories')->insertGetId(['name' => 'カテゴリ'.$number]),
        ], $attributes));
    }

    private function createSku(int $itemId, array $attributes = []): int
    {
        $number = DB::table('skus')->count() + 1;

        return DB::table('skus')->insertGetId(array_replace([
            'item_id' => $itemId,
            'sku_code' => 'sku-'.$number,
            'tq_item_no' => 'tq-'.$number,
            'tq_color_no' => '01',
            'tq_size' => '00',
        ], $attributes));
    }
}
