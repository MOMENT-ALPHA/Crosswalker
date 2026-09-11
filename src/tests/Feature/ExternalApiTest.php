<?php

namespace Tests\Feature;

use App\Models\ApiSetting;
use App\Models\Item;
use App\Models\Sku;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class ExternalApiTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function enable(): void
    {
        $setting = ApiSetting::factory()->create(['id' => 1, 'enabled' => true, 'api_key_hash' => hash('sha256', 'test-key')]);
        $setting->allowedSources()->create(['value' => '127.0.0.0/8']);
    }

    public function test_external_api_requires_enabled_state_key_and_allowed_ip(): void
    {
        $this->getJson('/api/v1/items')->assertForbidden();
        $this->enable();
        $this->getJson('/api/v1/items')->assertUnauthorized();
        $this->withToken('test-key')->getJson('/api/v1/items')->assertOk();
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])->withHeader('X-Forwarded-For', '127.0.0.1')->getJson('/api/v1/items')->assertForbidden();
    }

    public function test_all_lookups_preserve_codes_and_report_effective_inactive_status(): void
    {
        $this->enable();
        $item = Item::factory()->create(['item_no' => '00001', 'parent_asin' => 'PARENT', 'is_active' => false]);
        $sku = Sku::factory()->for($item)->create(['sku_code' => '00001-01-00', 'child_asin' => 'CHILD', 'tq_item_no' => '00001', 'tq_color_no' => '01', 'tq_size' => '']);
        $this->withToken('test-key')->getJson('/api/v1/items/00001')->assertOk()->assertJsonPath('item.status', 'inactive')->assertJsonPath('item.skus.0.status', 'inactive');
        $this->getJson('/api/v1/skus/00001-01-00')->assertOk()->assertJsonPath('sku.tq_color_no', '01');
        $this->getJson('/api/v1/tq-skus?tq_item_no=00001&tq_color_no=01&')->assertOk()->assertJsonPath('sku.tq_size', '');
        $this->getJson('/api/v1/asins/PARENT')->assertOk()->assertJsonPath('data.0.item_no', '00001');
        $this->getJson('/api/v1/asins/CHILD')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/tq-skus')->assertBadRequest();
        $this->getJson('/api/v1/items/missing')->assertNotFound();
        $this->assertDatabaseHas('skus', ['id' => $sku->id, 'is_active' => true]);
    }

    public function test_batch_lookup_returns_only_matching_items_with_all_skus(): void
    {
        $this->enable();
        $first = Item::factory()->create(['item_no' => '00001', 'is_active' => false]);
        Sku::factory()->for($first)->create(['sku_code' => '00001-01', 'is_active' => true]);
        $second = Item::factory()->create(['item_no' => '00002']);
        Sku::factory()->for($second)->create(['is_active' => false]);
        Item::factory()->create(['item_no' => '000010']);

        $response = $this->withToken('test-key')->postJson('/api/v1/items/lookup', [
            'item_nos' => ['00002', 'missing', '00001', '00001'],
        ])->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.item_no', '00001')
            ->assertJsonPath('data.0.status', 'inactive')
            ->assertJsonPath('data.0.skus.0.sku_code', '00001-01')
            ->assertJsonPath('data.0.skus.0.status', 'inactive')
            ->assertJsonPath('data.1.item_no', '00002')
            ->assertJsonPath('data.1.skus.0.status', 'inactive')
            ->assertJsonMissingPath('meta');
        $single = $this->getJson('/api/v1/items/00001')->assertOk();
        $this->assertSame($single->json('item'), $response->json('data.0'));
        $this->postJson('/api/v1/items/lookup', ['item_nos' => ['missing']])
            ->assertOk()->assertExactJson(['data' => []]);
    }

    public function test_batch_lookup_validates_the_item_number_list(): void
    {
        $this->enable();
        $this->withToken('test-key');
        foreach ([[], ['item_nos' => []], ['item_nos' => '00001'], ['item_nos' => [1]],
            ['item_nos' => ['']], ['item_nos' => [null]], ['item_nos' => [['00001']]],
            ['item_nos' => ['key' => '00001']], ['item_nos' => [str_repeat('a', 256)]],
            ['item_nos' => array_fill(0, 101, '00001')]] as $payload) {
            $this->postJson('/api/v1/items/lookup', $payload)->assertBadRequest()->assertJsonStructure(['message', 'errors']);
        }
        $codes = array_map(fn ($i) => sprintf('%05d', $i), range(1, 100));
        foreach ($codes as $code) {
            Item::factory()->create(['item_no' => $code]);
        }
        $this->postJson('/api/v1/items/lookup', ['item_nos' => $codes])->assertOk()->assertJsonCount(100, 'data');
    }

    public function test_batch_lookup_requires_enabled_state_key_and_allowed_ip(): void
    {
        $payload = ['item_nos' => ['00001']];
        $this->postJson('/api/v1/items/lookup', $payload)->assertForbidden();
        $this->enable();
        $this->postJson('/api/v1/items/lookup', $payload)->assertUnauthorized();
        $this->withToken('wrong')->postJson('/api/v1/items/lookup', $payload)->assertUnauthorized();
        $this->withToken('test-key')->postJson('/api/v1/items/lookup', $payload)->assertOk();
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.1'])
            ->postJson('/api/v1/items/lookup', $payload)->assertForbidden();
    }

    public function test_rotated_key_is_revoked_immediately(): void
    {
        $this->enable();
        ApiSetting::find(1)->update(['api_key_hash' => hash('sha256', 'new-key')]);
        $this->withToken('test-key')->getJson('/api/v1/items')->assertUnauthorized();
        $this->withToken('new-key')->getJson('/api/v1/items')->assertOk();
    }

    public function test_error_responses_hide_internal_details_even_in_debug_mode(): void
    {
        config(['app.debug' => true]);
        $this->enable();
        $this->withToken('test-key')->getJson('/api/v1/items/missing')
            ->assertNotFound()->assertExactJson(['message' => '対象データが見つかりません。']);
        $this->withToken('wrong')->getJson('/api/v1/items')
            ->assertUnauthorized()->assertJsonMissingPath('exception')->assertJsonMissingPath('trace');
    }

    public function test_external_requests_are_rate_limited_before_authentication(): void
    {
        for ($i = 0; $i < 120; $i++) {
            $this->getJson('/api/v1/items')->assertForbidden();
        }
        $this->getJson('/api/v1/items')->assertTooManyRequests()->assertHeader('Retry-After');
    }
}
