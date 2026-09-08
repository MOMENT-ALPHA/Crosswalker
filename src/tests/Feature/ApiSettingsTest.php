<?php

namespace Tests\Feature;

use App\Models\ApiSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class ApiSettingsTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_key_is_only_returned_at_issuance_and_only_hash_is_stored(): void
    {
        $this->actingAs(User::factory()->create());
        $key = $this->postJson('/api/admin/api-settings/key')->assertOk()->json('key');
        $this->assertSame(hash('sha256', $key), ApiSetting::find(1)->api_key_hash);
        $this->getJson('/api/admin/api-settings')->assertOk()->assertJsonMissingPath('data.api_key_hash')->assertDontSee($key, false);
        $next = $this->postJson('/api/admin/api-settings/key')->assertOk()->json('key');
        $this->assertNotSame($key, $next);
        $this->assertSame(hash('sha256', $next), ApiSetting::find(1)->api_key_hash);
    }

    public function test_enabled_api_requires_key_and_valid_nonempty_allowlist(): void
    {
        $this->actingAs(User::factory()->create());
        $this->putJson('/api/admin/api-settings', ['enabled' => true, 'allowed_sources' => []])->assertUnprocessable();
        $this->putJson('/api/admin/api-settings', ['enabled' => true, 'allowed_sources' => [['value' => '192.0.2.1']]])->assertUnprocessable();
        $this->postJson('/api/admin/api-settings/key')->assertOk();
        $this->putJson('/api/admin/api-settings', ['enabled' => true, 'allowed_sources' => [['value' => '2001:db8::123/64', 'memo' => '倉庫']]])->assertOk()->assertJsonPath('data.allowed_sources.0.value', '2001:db8::/64');
        $this->putJson('/api/admin/api-settings', ['enabled' => false, 'allowed_sources' => [['value' => '192.0.2.0/33']]])->assertUnprocessable();
        $this->assertDatabaseHas('api_settings', ['id' => 1, 'enabled' => true]);
        $this->assertDatabaseHas('api_allowed_sources', ['value' => '2001:db8::/64']);
    }
}
