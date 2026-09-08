<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchItemsRequest;
use App\Http\Resources\ExternalItemResource;
use App\Models\Item;
use App\Models\Sku;
use App\Services\CatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExternalCatalogController extends Controller
{
    public function index(SearchItemsRequest $request, CatalogService $catalog): AnonymousResourceCollection
    {
        return ExternalItemResource::collection($catalog->search($request->validated())->paginate($request->integer('per_page', 10)));
    }

    public function item(string $itemNo): JsonResponse
    {
        return response()->json(['item' => new ExternalItemResource(Item::with(['brand', 'category', 'skus'])->where('item_no', $itemNo)->firstOrFail())]);
    }

    public function sku(string $skuCode): JsonResponse
    {
        return $this->skuResponse(Sku::where('sku_code', $skuCode)->firstOrFail());
    }

    public function tq(Request $request): JsonResponse
    {
        $data = $request->validate(['tq_item_no' => ['required', 'string', 'max:255'], 'tq_color_no' => ['required', 'string', 'max:255'], 'tq_size' => ['required', 'string', 'max:255']]);

        return $this->skuResponse(Sku::where($data)->firstOrFail());
    }

    public function asin(Request $request, string $asin): AnonymousResourceCollection
    {
        $request->validate(['page' => ['nullable', 'integer', 'min:1']]);
        $query = Item::with(['brand', 'category', 'skus'])->where(fn ($q) => $q->where('parent_asin', $asin)->orWhereHas('skus', fn ($sku) => $sku->where('child_asin', $asin)))->orderBy('id');
        abort_unless((clone $query)->exists(), 404);

        return ExternalItemResource::collection($query->paginate(10));
    }

    private function skuResponse(Sku $sku): JsonResponse
    {
        $item = Item::with(['brand', 'category', 'skus'])->findOrFail($sku->item_id);
        $resource = new ExternalItemResource($item);

        return response()->json(['item' => $resource, 'sku' => collect($resource->resolve()['skus'])->firstWhere('sku_code', $sku->sku_code)]);
    }
}
