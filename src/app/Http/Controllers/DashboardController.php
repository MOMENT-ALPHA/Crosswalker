<?php

namespace App\Http\Controllers;

use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\Sku;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $activeSkus = Sku::where('is_active', true)->whereHas('item', fn ($q) => $q->where('is_active', true));

        return response()->json([
            'stats' => ['itemCount' => Item::where('is_active', true)->count(), 'skuCount' => (clone $activeSkus)->count(), 'noParentAsinCount' => Item::where('is_active', true)->whereNull('parent_asin')->count(), 'noChildAsinCount' => (clone $activeSkus)->whereNull('child_asin')->count()],
            'recent_items' => ItemResource::collection(Item::with(['brand', 'category', 'skus'])->where('is_active', true)->orderByDesc('updated_at')->orderByDesc('id')->limit(8)->get()),
        ]);
    }
}
