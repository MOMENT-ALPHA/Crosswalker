<?php

namespace App\Http\Controllers;

use App\Models\ApiSetting;
use App\Services\AllowedSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApiSettingController extends Controller
{
    private function settings(): ApiSetting
    {
        DB::table('api_settings')->insertOrIgnore(['id' => 1, 'enabled' => false, 'created_at' => now(), 'updated_at' => now()]);

        return ApiSetting::findOrFail(1);
    }

    public function show(): JsonResponse
    {
        $settings = $this->settings()->load('allowedSources');

        return response()->json(['data' => [
            'enabled' => $settings->enabled, 'key_issued_at' => $settings->key_issued_at?->toISOString(),
            'key_masked' => $settings->key_last_four ? 'cwk_live_••••••••••••'.$settings->key_last_four : null,
            'allowed_sources' => $settings->allowedSources->map(fn ($source) => ['id' => $source->id, 'value' => $source->value, 'memo' => $source->memo ?? '', 'kind' => str_contains($source->value, '/') ? 'cidr' : 'ip']),
        ]])->header('Cache-Control', 'no-store');
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'], 'allowed_sources' => ['present', 'array', 'max:100'],
            'allowed_sources.*' => ['array:value,memo'], 'allowed_sources.*.value' => ['required', 'string', 'max:49'],
            'allowed_sources.*.memo' => ['nullable', 'string', 'max:1000'],
        ]);
        if ($data['enabled'] && count($data['allowed_sources']) === 0) {
            throw ValidationException::withMessages(['allowed_sources' => 'APIを有効にするには許可IP/CIDRを1件以上登録してください。']);
        }
        $seen = [];
        foreach ($data['allowed_sources'] as $index => &$source) {
            $value = AllowedSource::normalize($source['value']);
            if ($value === null || isset($seen[$value])) {
                throw ValidationException::withMessages(["allowed_sources.$index.value" => '正しいIP/CIDRを重複しないように入力してください。']);
            }
            $source['value'] = $value;
            $seen[$value] = true;
        }
        unset($source);
        $settings = $this->settings();
        DB::transaction(function () use ($settings, $data) {
            $settings = ApiSetting::lockForUpdate()->findOrFail($settings->id);
            if ($data['enabled'] && ! $settings->api_key_hash) {
                throw ValidationException::withMessages(['enabled' => '先にAPIキーを発行してください。']);
            }
            $settings->update(['enabled' => $data['enabled']]);
            $settings->allowedSources()->delete();
            $settings->allowedSources()->createMany($data['allowed_sources']);
        });

        return $this->show();
    }

    public function issueKey(): JsonResponse
    {
        $key = 'cwk_live_'.bin2hex(random_bytes(32));
        $this->settings()->update(['api_key_hash' => hash('sha256', $key), 'key_last_four' => substr($key, -4), 'key_issued_at' => now()]);

        return response()->json(['key' => $key])->header('Cache-Control', 'no-store');
    }
}
