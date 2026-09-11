<?php

use App\Http\Controllers\ExternalCatalogController;
use App\Http\Middleware\AuthenticateExternalApi;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['throttle:external', AuthenticateExternalApi::class])->group(function () {
    Route::post('items/lookup', [ExternalCatalogController::class, 'lookup']);
    Route::get('items', [ExternalCatalogController::class, 'index']);
    Route::get('items/{itemNo}', [ExternalCatalogController::class, 'item']);
    Route::get('skus/{skuCode}', [ExternalCatalogController::class, 'sku']);
    Route::get('asins/{asin}', [ExternalCatalogController::class, 'asin']);
    Route::get('tq-skus', [ExternalCatalogController::class, 'tq']);
});
