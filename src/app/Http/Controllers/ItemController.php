<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveItemRequest;
use App\Http\Requests\SearchItemsRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\Sku;
use App\Services\CatalogService;
use App\Services\CsvImportService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class ItemController extends Controller
{
    public function index(SearchItemsRequest $request, CatalogService $catalog): AnonymousResourceCollection
    {
        return ItemResource::collection($catalog->search($request->validated())->paginate($request->integer('per_page', 10)));
    }

    public function export(SearchItemsRequest $request, CatalogService $catalog, CsvImportService $csv): Response
    {
        $rows = [CsvImportService::COLUMNS];
        foreach ($catalog->search($request->validated())->lazy(500) as $item) {
            foreach ($item->skus as $sku) {
                $rows[] = [
                    $item->item_no,
                    $item->category->name,
                    $item->brand->name,
                    $item->parent_asin ?? '',
                    $item->is_active ? '1' : '0',
                    $sku->sku_code,
                    $sku->child_asin ?? '',
                    $sku->is_active ? '1' : '0',
                    $sku->tq_item_no,
                    $sku->tq_color_no,
                    $sku->tq_size,
                ];
                if (count($rows) > 10001) {
                    throw ValidationException::withMessages(['export' => 'CSV取込の上限（10000行）を超えています。検索条件を絞り込んでください。']);
                }
            }
        }
        if (count($rows) === 1) {
            throw ValidationException::withMessages(['export' => '出力対象のSKUがありません。']);
        }
        // 再取込で識別子やマスタ名称が変わらないよう、値への接頭辞追加は行わない。
        $content = $csv->csv($rows, escapeFormulas: false);
        if (strlen($content) > 5120 * 1024) {
            throw ValidationException::withMessages(['export' => 'CSV取込の上限（5MB）を超えています。検索条件を絞り込んでください。']);
        }

        return response($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="crosswalker_items.csv"',
        ]);
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
