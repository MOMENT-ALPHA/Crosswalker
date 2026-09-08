<?php

use App\Http\Middleware\RequireHttps;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(RequireHttps::class);
        $middleware->redirectGuestsTo(fn () => '/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());
        $exceptions->render(function (ValidationException $exception, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json(['message' => '入力内容を確認してください。', 'errors' => $exception->errors()], 400);
            }
        });
        $exceptions->render(function (QueryException $exception, Request $request) {
            if ($request->is('api/*') && str_starts_with((string) $exception->getCode(), '23')) {
                return response()->json(['message' => '重複または関連データの変更により保存できません。再読込して確認してください。'], 422);
            }
        });
        $exceptions->respond(function ($response, Throwable $exception, Request $request) {
            if ($request->is('api/*') && $response->getStatusCode() >= 400) {
                $status = $response->getStatusCode();
                $body = json_decode($response->getContent(), true) ?? [];
                $message = match (true) {
                    $status >= 500 => 'サーバーエラーが発生しました。',
                    $status === 404 => '対象データが見つかりません。',
                    default => $body['message'] ?? 'リクエストを処理できませんでした。',
                };
                $data = ['message' => $message];
                if ($exception instanceof ValidationException) {
                    $data['errors'] = $exception->errors();
                }
                $response->setContent(json_encode($data, JSON_UNESCAPED_UNICODE));
                $response->headers->set('Content-Type', 'application/json');
                $response->headers->set('Cache-Control', 'no-store');
            }

            return $response;
        });
    })->create();
