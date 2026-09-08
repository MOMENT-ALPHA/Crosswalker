<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Model::preventLazyLoading(! app()->isProduction());
        TrustProxies::at(config('crosswalker.trusted_proxies', []));
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(30)->by('ip:'.$request->ip()),
            Limit::perMinute(5)->by('account:'.hash('sha256', mb_strtolower(is_string($request->input('login_id')) ? $request->input('login_id') : '').'|'.$request->ip())),
        ]);
        RateLimiter::for('external', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));
    }
}
