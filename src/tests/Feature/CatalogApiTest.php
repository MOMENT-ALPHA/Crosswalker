<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Item;
use App\Models\Sku;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CatalogApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function payload(): array
    {
        return ['item_no' => '00001', 'brand_id' => Brand::factory()->create()->id, 'category_id' => Category::factory()->create()->id, 'parent_asin' => '', 'is_active' => true,
            'skus' => [['sku_code' => '00001-01-00', 'child_asin' => '', 'tq_item_no' => '00001', 'tq_color_no' => '01', 'tq_size' => '00', 'is_active' => true]]];
    }

    public function test_all_management_endpoints_require_session_authentication(): void
    {
        foreach (['items', 'dashboard', 'masters/brands', 'masters/categories', 'api-settings', 'csv/template'] as $path) {
            $this->getJson('/api/admin/'.$path)->assertUnauthorized();
        }
        $this->postJson('/api/admin/items', [])->assertUnauthorized();
    }

    public function test_creates_updates_and_deletes_item_with_skus_atomically(): void
    {
        $this->actingAs(User::factory()->create());
        $data = $this->payload();
        $created = $this->postJson('/api/admin/items', $data)->assertCreated()->assertJsonPath('data.skus.0.tq_color_no', '01')->assertJsonMissingPath('data.memo');
        $id = $created->json('data.id');
        $skuId = $created->json('data.skus.0.id');
        $this->assertDatabaseHas('items', ['id' => $id, 'parent_asin' => null]);
        $data['skus'][0]['id'] = $skuId;
        $data['skus'][0]['is_active'] = false;
        $this->putJson('/api/admin/items/'.$id, $data)->assertOk()->assertJsonPath('data.skus.0.id', $skuId)->assertJsonPath('data.skus.0.is_active', false);
        $this->deleteJson('/api/admin/items/'.$id)->assertNoContent();
        $this->assertDatabaseCount('skus', 0);
        $this->assertDatabaseCount('items', 0);
    }

    public function test_invalid_sku_does_not_partially_save_item(): void
    {
        $this->actingAs(User::factory()->create());
        $data = $this->payload();
        $data['skus'][0]['tq_size'] = '';
        $this->postJson('/api/admin/items', $data)->assertUnprocessable()->assertJsonValidationErrors('skus.0.tq_size');
        $this->assertDatabaseCount('items', 0);
    }

    public function test_rejects_foreign_sku_ids_and_duplicate_keys_without_changing_data(): void
    {
        $this->actingAs(User::factory()->create());
        $foreign = Sku::factory()->create();
        $data = $this->payload();
        $data['skus'][0]['id'] = $foreign->id;
        $this->postJson('/api/admin/items', $data)->assertUnprocessable()->assertJsonValidationErrors('skus.0.id');
        unset($data['skus'][0]['id']);
        $data['skus'][0]['sku_code'] = $foreign->sku_code;
        $this->postJson('/api/admin/items', $data)->assertUnprocessable()->assertJsonValidationErrors('skus.0.sku_code');
        $this->assertDatabaseCount('items', 1);
        $this->assertDatabaseCount('skus', 1);
    }

    public function test_reorders_existing_skus_and_can_exchange_unique_keys(): void
    {
        $this->actingAs(User::factory()->create());
        $data = $this->payload();
        $data['skus'][] = array_replace($data['skus'][0], ['sku_code' => 'second', 'tq_size' => '05']);
        $response = $this->postJson('/api/admin/items', $data)->assertCreated();
        $id = $response->json('data.id');
        $skus = $response->json('data.skus');
        $data['skus'][0]['id'] = $skus[1]['id'];
        $data['skus'][1]['id'] = $skus[0]['id'];
        $this->putJson('/api/admin/items/'.$id, $data)->assertOk()->assertJsonPath('data.skus.0.id', $skus[1]['id'])->assertJsonPath('data.skus.0.sku_code', '00001-01-00');
    }

    public function test_search_pagination_status_and_dashboard_use_persisted_data(): void
    {
        $this->actingAs(User::factory()->create());
        $first = Item::factory()->create(['item_no' => 'first']);
        Sku::factory()->for($first)->create(['tq_color_no' => '001']);
        Sku::factory()->for($first)->create(['is_active' => false]);
        Item::factory()->create(['is_active' => false]);
        $this->getJson('/api/admin/items?keyword=001')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $first->id);
        $this->getJson('/api/admin/items?status=all&per_page=1&page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 2);
        $this->getJson('/api/admin/dashboard')->assertOk()->assertJsonPath('stats.itemCount', 1)->assertJsonPath('stats.skuCount', 1)->assertJsonPath('stats.noChildAsinCount', 1);
        $this->patchJson('/api/admin/items/'.$first->id.'/status', ['is_active' => false])->assertOk();
        $this->assertDatabaseHas('skus', ['item_id' => $first->id, 'is_active' => true]);
    }

    public function test_master_names_are_trimmed_unique_and_used_masters_cannot_be_deleted(): void
    {
        $this->actingAs(User::factory()->create());
        $id = $this->postJson('/api/admin/masters/brands', ['name' => '  栞  '])->assertCreated()->assertJsonPath('data.name', '栞')->json('data.id');
        $this->postJson('/api/admin/masters/brands', ['name' => '栞'])->assertUnprocessable();
        Item::factory()->create(['brand_id' => $id]);
        $this->deleteJson('/api/admin/masters/brands/'.$id)->assertUnprocessable();
        $this->putJson('/api/admin/masters/brands/'.$id, ['name' => '栞改'])->assertOk();
        $category = $this->postJson('/api/admin/masters/categories', ['name' => '不要'])->assertCreated()->json('data.id');
        $this->deleteJson('/api/admin/masters/categories/'.$category)->assertNoContent();
    }
}
