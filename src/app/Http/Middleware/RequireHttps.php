<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(app()->isProduction() && ! $request->isSecure(), 403, 'HTTPSで接続してください。');
        $response = $next($request);
        if ($request->is('api/*')) {
            $response->headers->set('Cache-Control', 'no-store');
        }

        return $response;
    }
}
