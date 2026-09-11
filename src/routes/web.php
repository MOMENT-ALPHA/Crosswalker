<?php

use App\Http\Controllers\ApiSettingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CsvImportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\MasterController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/admin')->group(function () {
    Route::get('csrf', [AuthController::class, 'csrf']);
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('dashboard', DashboardController::class);
        Route::get('items/export', [ItemController::class, 'export']);
        Route::apiResource('items', ItemController::class);
        Route::patch('items/{item}/status', [ItemController::class, 'status']);
        Route::patch('items/{item}/skus/{sku}/status', [ItemController::class, 'skuStatus']);
        Route::get('masters/{master}', [MasterController::class, 'index'])->whereIn('master', ['brands', 'categories']);
        Route::post('masters/{master}', [MasterController::class, 'store'])->whereIn('master', ['brands', 'categories']);
        Route::put('masters/{master}/{id}', [MasterController::class, 'update'])->whereIn('master', ['brands', 'categories'])->whereNumber('id');
        Route::delete('masters/{master}/{id}', [MasterController::class, 'destroy'])->whereIn('master', ['brands', 'categories'])->whereNumber('id');
        Route::get('api-settings', [ApiSettingController::class, 'show']);
        Route::put('api-settings', [ApiSettingController::class, 'update']);
        Route::post('api-settings/key', [ApiSettingController::class, 'issueKey'])->middleware('throttle:10,1');
        Route::get('csv/template', [CsvImportController::class, 'template']);
        Route::post('csv/validate', [CsvImportController::class, 'validateFile'])->middleware('throttle:10,1');
        Route::post('csv/import', [CsvImportController::class, 'import'])->middleware('throttle:10,1');
        Route::get('csv/{token}/result', [CsvImportController::class, 'result'])->whereUuid('token');
    });
});
Route::get('/{any?}', fn () => view('app'))->where('any', '(?!api(?:/|$)).*');
