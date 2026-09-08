<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveItemRequest;
use App\Http\Requests\SearchItemsRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\Sku;
use App\Services\CatalogService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ItemController extends Controller
{
    public function index(SearchItemsRequest $request, CatalogService $catalog): AnonymousResourceCollection
    {
        return ItemResource::collection($catalog->search($request->validated())->paginate($request->integer('per_page', 10)));
    }

    public function show(Item $item): ItemResource
    {
        return new ItemResource($item->load(['brand', 'category', 'skus']));
    }

    public function store(SaveItemRequest $request, CatalogService $catalog): ItemResource
    {
        return new ItemResource($catalog->save($request->validated()));
    }

    public function update(SaveItemRequest $request, Item $item, CatalogService $catalog): ItemResource
    {
        return new ItemResource($catalog->save($request->validated(), $item));
    }

    public function destroy(Item $item): Response
    {
        DB::transaction(fn () => $item->delete());

        return response()->noContent();
    }

    public function status(Request $request, Item $item): ItemResource
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $item->update($data);

        return $this->show($item);
    }

    public function skuStatus(Request $request, Item $item, Sku $sku): ItemResource
    {
        abort_unless($sku->item_id === $item->id, 404);
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        DB::transaction(function () use ($item, $sku, $data) {
            $sku->update($data);
            $item->touch();
        });

        return $this->show($item);
    }
}
