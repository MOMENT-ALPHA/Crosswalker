<?php

namespace App\Services;

use App\Models\Item;
use App\Models\Sku;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CatalogService
{
    public function search(array $filters): Builder
    {
        $query = Item::query()->with(['brand', 'category', 'skus']);
        $status = $filters['status'] ?? 'active';
        if ($status !== 'all') {
            $query->where('is_active', $status === 'active');
        }
        foreach (['brand_id', 'category_id'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (($filters['filter'] ?? '') === 'no_parent_asin') {
            $query->whereNull('parent_asin');
        }
        if (($filters['filter'] ?? '') === 'no_child_asin') {
            $query->whereHas('skus', fn (Builder $q) => $q->where('is_active', true)->whereNull('child_asin'));
        }
        $keyword = $filters['keyword'] ?? '';
        if ($keyword !== '') {
            $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($keyword)).'%';
            $query->where(function (Builder $q) use ($pattern) {
                $q->whereRaw("LOWER(item_no) LIKE ? ESCAPE '!'", [$pattern])->orWhereRaw("LOWER(parent_asin) LIKE ? ESCAPE '!'", [$pattern])
                    ->orWhereHas('skus', function (Builder $sku) use ($pattern) {
                        $sku->where(function (Builder $fields) use ($pattern) {
                            foreach (['sku_code', 'child_asin', 'tq_item_no', 'tq_color_no', 'tq_size'] as $field) {
                                $fields->orWhereRaw("LOWER($field) LIKE ? ESCAPE '!'", [$pattern]);
                            }
                        });
                    });
            });
        }

        return $query->orderByDesc('updated_at')->orderByDesc('id');
    }

    public function save(array $data, ?Item $item = null): Item
    {
        return DB::transaction(function () use ($data, $item) {
            if ($item) {
                $item = Item::query()->lockForUpdate()->findOrFail($item->id);
            }
            $item ??= new Item;
            $this->validateKeys($data, $item);
            $item->fill(Arr::except($data, 'skus'))->save();
            $ids = array_values(array_filter(array_column($data['skus'], 'id')));
            $item->skus()->whereNotIn('id', $ids)->delete();
            // Release unique keys inside this transaction so existing SKU rows can exchange keys.
            foreach ($item->skus()->lockForUpdate()->get() as $sku) {
                $temporary = '__cw_'.Str::uuid();
                $sku->update(['sku_code' => $temporary, 'child_asin' => null, 'tq_item_no' => $temporary]);
            }
            foreach ($data['skus'] as $index => $row) {
                $sku = empty($row['id']) ? $item->skus()->make() : $item->skus()->findOrFail($row['id']);
                $sku->fill(Arr::except($row, 'id'));
                $sku->sort_order = $index + 1;
                $sku->save();
            }
            $item->touch();

            return $item->load(['brand', 'category', 'skus']);
        }, 3);
    }

    private function validateKeys(array $data, Item $item): void
    {
        $errors = [];
        if (Item::where('item_no', $data['item_no'])->when($item->exists, fn (Builder $q) => $q->whereKeyNot($item->id))->exists()) {
            $errors['item_no'] = ['この品番コードは既に登録されています。'];
        }
        $ownedIds = $item->exists ? $item->skus()->pluck('id')->all() : [];
        $seen = [];
        foreach ($data['skus'] as $index => $row) {
            if (! empty($row['id']) && ! in_array($row['id'], $ownedIds)) {
                $errors["skus.$index.id"] = ['この品番に属するSKUを指定してください。'];
            }
            foreach (['sku_code', 'child_asin', 'tq_key'] as $field) {
                $columns = $field === 'tq_key' ? ['tq_item_no', 'tq_color_no', 'tq_size'] : [$field];
                $values = array_map(fn (string $column) => $row[$column] ?? null, $columns);
                if ($field === 'child_asin' && $values[0] === null) {
                    continue;
                }
                $key = json_encode(array_map(fn ($value) => mb_strtolower((string) ($value ?? '')), $values));
                $existing = Sku::whereNotIn('id', $ownedIds);
                foreach ($columns as $i => $column) {
                    $existing->where($column, $values[$i]);
                }
                if (isset($seen[$field][$key]) || $existing->exists()) {
                    $errors['skus.'.$index.'.'.$columns[0]] = ['入力内または登録済みデータと重複しています。'];
                }
                $seen[$field][$key] = true;
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
