<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExternalItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'item_no' => $this->item_no, 'name' => $this->name, 'brand' => $this->brand->name, 'category' => $this->category->name,
            'parent_asin' => $this->parent_asin, 'status' => $this->is_active ? 'active' : 'inactive',
            'skus' => $this->skus->map(fn ($sku) => [
                'sku_code' => $sku->sku_code, 'child_asin' => $sku->child_asin,
                'status' => $this->is_active && $sku->is_active ? 'active' : 'inactive',
                'tq_item_no' => $sku->tq_item_no, 'tq_color_no' => $sku->tq_color_no, 'tq_size' => $sku->tq_size,
            ]), 'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
