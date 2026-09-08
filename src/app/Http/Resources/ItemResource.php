<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'item_no' => $this->item_no, 'brand_id' => $this->brand_id, 'category_id' => $this->category_id,
            'brand_name' => $this->brand->name, 'category_name' => $this->category->name,
            'parent_asin' => $this->parent_asin ?? '', 'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toISOString(), 'updated_at' => $this->updated_at?->toISOString(),
            'sku_count' => $this->skus->count(),
            'skus' => $this->skus->map(fn ($sku) => [
                'id' => $sku->id, 'item_id' => $this->id, 'sku_code' => $sku->sku_code, 'child_asin' => $sku->child_asin ?? '',
                'tq_item_no' => $sku->tq_item_no, 'tq_color_no' => $sku->tq_color_no, 'tq_size' => $sku->tq_size,
                'is_active' => $sku->is_active, 'sort_order' => $sku->sort_order,
                'created_at' => $sku->created_at?->toISOString(), 'updated_at' => $sku->updated_at?->toISOString(),
            ]),
        ];
    }
}
