<?php

namespace App\Http\Middleware;

use App\Models\ApiSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateExternalApi
{
    public function handle(Request $request, Closure $next): Response
    {
        $settings = ApiSetting::with('allowedSources')->find(1);
        abort_unless($settings?->enabled, 403, '外部APIは無効です。');
        $key = $request->bearerToken();
        abort_unless(is_string($key) && $settings->api_key_hash && hash_equals($settings->api_key_hash, hash('sha256', $key)), 401, 'APIキーが正しくありません。');
        abort_unless($request->ip() && IpUtils::checkIp($request->ip(), $settings->allowedSources->pluck('value')->all()), 403, '接続元が許可されていません。');

        return $next($request);
    }
}
