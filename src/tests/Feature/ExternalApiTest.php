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
