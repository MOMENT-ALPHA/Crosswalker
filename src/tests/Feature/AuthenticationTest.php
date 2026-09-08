<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_login_uses_login_id_and_logout_invalidates_authentication(): void
    {
        $user = User::factory()->create(['login_id' => 'operator', 'password' => 'valid-password']);
        $this->getJson('/api/admin/me')->assertUnauthorized();
        $this->postJson('/api/admin/login', ['login_id' => 'operator', 'password' => 'wrong'])->assertUnauthorized();
        $this->postJson('/api/admin/login', ['login_id' => 'operator', 'password' => 'valid-password'])->assertOk()->assertJsonPath('user.login_id', 'operator')->assertJsonMissingPath('user.password');
        $this->assertAuthenticatedAs($user);
        $this->getJson('/api/admin/me')->assertOk();
        $this->postJson('/api/admin/logout')->assertNoContent();
        $this->assertGuest();
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/admin/login', ['login_id' => 'missing', 'password' => 'wrong'])->assertUnauthorized();
        }
        $this->postJson('/api/admin/login', ['login_id' => 'missing', 'password' => 'wrong'])->assertTooManyRequests();
    }

    public function test_account_command_creates_a_hashed_password_without_requiring_email(): void
    {
        $this->artisan('crosswalker:create-user operator')->expectsQuestion('パスワード（12文字以上）', 'secure-password')->expectsQuestion('パスワード（確認）', 'secure-password')->expectsOutput('Web利用者を登録しました。')->assertSuccessful();
        $user = User::where('login_id', 'operator')->firstOrFail();
        $this->assertTrue(Hash::check('secure-password', $user->password));
        $this->assertNull($user->email);
    }

    public function test_csrf_protection_rejects_state_changes_without_token(): void
    {
        $this->app['env'] = 'local';
        $this->getJson('/api/admin/csrf')->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/admin/login', ['login_id' => 'operator', 'password' => 'password'])->assertStatus(419);
    }

    public function test_unknown_api_routes_return_json_instead_of_the_spa(): void
    {
        $this->get('/api/missing')->assertNotFound()->assertHeader('Content-Type', 'application/json');
    }

    public function test_invalid_login_payload_is_a_validation_error(): void
    {
        $this->postJson('/api/admin/login', ['login_id' => ['unexpected'], 'password' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('login_id');
    }
}
