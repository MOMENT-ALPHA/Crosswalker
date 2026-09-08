<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Item;
use App\Models\Sku;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CsvImportService
{
    public const COLUMNS = ['item_no', 'category_name', 'brand_name', 'parent_asin', 'item_status', 'sku_code', 'child_asin', 'sku_status', 'tq_item_no', 'tq_color_no', 'tq_size'];

    private const REQUIRED = ['item_no', 'category_name', 'brand_name', 'sku_code', 'tq_item_no', 'tq_color_no', 'tq_size'];

    public function parse(string $text): array
    {
        if (! mb_check_encoding($text, 'UTF-8') || str_contains($text, "\0")) {
            throw ValidationException::withMessages(['file' => 'UTF-8のCSVファイルを指定してください。']);
        }
        $text = preg_replace('/^\xEF\xBB\xBF/', '', $text);
        $records = [];
        $fields = [];
        $field = '';
        $state = 'start';
        $line = 1;
        $start = 1;
        for ($i = 0, $length = strlen($text); $i < $length; $i++) {
            $char = $text[$i];
            if ($state === 'quoted') {
                if ($char === '"') {
                    if (($text[$i + 1] ?? '') === '"') {
                        $field .= '"';
                        $i++;
                    } else {
                        $state = 'closed';
                    }
                } else {
                    $field .= $char;
                    if ($char === "\n") {
                        $line++;
                    }
                }

                continue;
            }
            if ($char === ',' || $char === "\r" || $char === "\n") {
                $fields[] = $field;
                $field = '';
                $state = 'start';
                if ($char !== ',') {
                    if ($char === "\r" && ($text[$i + 1] ?? '') === "\n") {
                        $i++;
                    }
                    if ($fields !== ['']) {
                        $records[] = ['line' => $start, 'fields' => $fields];
                    }
                    $fields = [];
                    $line++;
                    $start = $line;
                }
            } elseif ($char === '"' && $state === 'start') {
                $state = 'quoted';
            } elseif ($char === '"' || $state === 'closed') {
                throw ValidationException::withMessages(['file' => "{$line}行目の引用符が不正です。"]);
            } else {
                $field .= $char;
                $state = 'plain';
            }
        }
        if ($state === 'quoted') {
            throw ValidationException::withMessages(['file' => 'CSVの引用符が閉じていません。']);
        }
        if ($field !== '' || $fields !== [] || $state === 'closed') {
            $fields[] = $field;
            $records[] = ['line' => $start, 'fields' => $fields];
        }
        $header = array_shift($records)['fields'] ?? [];
        if (count($header) !== count(array_unique($header)) || array_diff(self::REQUIRED, $header) !== [] || array_diff($header, self::COLUMNS) !== []) {
            throw ValidationException::withMessages(['file' => 'CSVヘッダーが不正です。最新のテンプレートを使用してください。']);
        }
        if (count($records) === 0 || count($records) > 10000) {
            throw ValidationException::withMessages(['file' => 'データ行は1〜10000行で指定してください。']);
        }

        return array_map(function (array $record) use ($header) {
            if (count($record['fields']) !== count($header)) {
                throw ValidationException::withMessages(['file' => $record['line'].'行目の列数がヘッダーと一致しません。']);
            }
            $values = array_map(fn (string $value) => preg_replace('/^\s+|\s+$/u', '', $value), $record['fields']);

            return array_merge(array_fill_keys(self::COLUMNS, ''), array_combine($header, $values), ['__line' => $record['line']]);
        }, $records);
    }

    public function analyze(array $rows, string $fileName, bool $lock = false): array
    {
        $errors = [];
        $statuses = [];
        $groups = [];
        $skuPlans = [];
        $seen = [];
        $add = function (int $line, string $column, string $message) use (&$errors, &$statuses) {
            $errors[] = compact('line', 'column', 'message');
            $statuses[$line] = 'error';
        };
        $brands = Brand::all()->keyBy(fn ($m) => mb_strtolower($m->name));
        $categories = Category::all()->keyBy(fn ($m) => mb_strtolower($m->name));
        $itemsQuery = Item::whereIn('item_no', array_column($rows, 'item_no'));
        $skusQuery = Sku::where(fn ($q) => $q->whereIn('sku_code', array_column($rows, 'sku_code'))->orWhereIn('child_asin', array_filter(array_column($rows, 'child_asin')))->orWhereIn('tq_item_no', array_column($rows, 'tq_item_no')));
        if ($lock) {
            $itemsQuery->lockForUpdate();
            $skusQuery->lockForUpdate();
        }
        $items = $itemsQuery->get()->keyBy(fn ($m) => mb_strtolower($m->item_no));
        $skus = $skusQuery->get();
        $byCode = $skus->keyBy(fn ($m) => mb_strtolower($m->sku_code));
        $affectedCodes = array_map('mb_strtolower', array_column($rows, 'sku_code'));
        $unaffected = $skus->reject(fn ($sku) => in_array(mb_strtolower($sku->sku_code), $affectedCodes, true));
        foreach ($unaffected as $sku) {
            if ($sku->child_asin !== null) {
                $seen['child_asin'][mb_strtolower($sku->child_asin)] = 0;
            }
            $seen['tq_key'][$this->tqKey($sku->toArray())] = 0;
        }
        foreach ($rows as $row) {
            $line = $row['__line'];
            $rules = [];
            foreach (self::COLUMNS as $column) {
                $rules[$column] = [in_array($column, self::REQUIRED, true) ? 'required' : 'nullable', 'string', 'max:255'];
            }
            $rules['item_status'][] = 'in:active,inactive';
            $rules['sku_status'][] = 'in:active,inactive';
            $validator = Validator::make($row, $rules, ['required' => '必須項目です。', 'max' => '255文字以内で入力してください。', 'in' => 'activeまたはinactiveを指定してください。']);
            foreach ($validator->errors()->messages() as $column => $messages) {
                $add($line, $column, $messages[0]);
            }
            if ($validator->fails()) {
                continue;
            }
            $brand = $brands->get(mb_strtolower($row['brand_name']));
            $category = $categories->get(mb_strtolower($row['category_name']));
            if (! $brand) {
                $add($line, 'brand_name', '登録済みのブランド名称を指定してください。');
            }
            if (! $category) {
                $add($line, 'category_name', '登録済みのカテゴリ名称を指定してください。');
            }
            $key = mb_strtolower($row['item_no']);
            $item = $items->get($key);
            $sku = $byCode->get(mb_strtolower($row['sku_code']));
            if ($sku && $sku->item_id !== $item?->id) {
                $add($line, 'sku_code', '別の品番に属するSKUは移動できません。');
            }
            $attributes = ['item_no' => $row['item_no'], 'brand_id' => $brand?->id, 'category_id' => $category?->id, 'parent_asin' => $row['parent_asin'] === '' ? null : $row['parent_asin']];
            if (! isset($groups[$key])) {
                $groups[$key] = ['model' => $item, 'attributes' => $attributes, 'status' => null, 'lines' => []];
            } elseif ($groups[$key]['attributes'] !== $attributes) {
                $add($line, 'item_no', '同一品番のブランド・カテゴリ・親ASINを統一してください。');
            }
            $groups[$key]['lines'][] = $line;
            if ($row['item_status'] !== '') {
                if ($groups[$key]['status'] !== null && $groups[$key]['status'] !== $row['item_status']) {
                    $add($line, 'item_status', '同一品番の状態が矛盾しています。');
                }
                $groups[$key]['status'] = $row['item_status'];
            }
            foreach (['sku_code' => mb_strtolower($row['sku_code']), 'child_asin' => mb_strtolower($row['child_asin']), 'tq_key' => $this->tqKey($row)] as $column => $value) {
                if ($column === 'child_asin' && $value === '') {
                    continue;
                }
                if (isset($seen[$column][$value])) {
                    $add($line, $column === 'tq_key' ? 'tq_item_no' : $column, '入力内または登録済みデータと重複しています。');
                }
                $seen[$column][$value] = $line;
            }
            $skuPlans[] = ['model' => $sku, 'item_key' => $key, 'line' => $line, 'attributes' => [
                'sku_code' => $row['sku_code'], 'child_asin' => $row['child_asin'] === '' ? null : $row['child_asin'],
                'tq_item_no' => $row['tq_item_no'], 'tq_color_no' => $row['tq_color_no'], 'tq_size' => $row['tq_size'],
                'is_active' => $row['sku_status'] === '' ? ($sku?->is_active ?? true) : $row['sku_status'] === 'active',
            ]];
        }
        foreach ($groups as &$group) {
            $group['attributes']['is_active'] = $group['status'] === null ? ($group['model']?->is_active ?? true) : $group['status'] === 'active';
            $group['changed'] = ! $group['model'] || $group['model']->fill($group['attributes'])->isDirty();
        }
        unset($group);
        foreach ($skuPlans as &$plan) {
            $plan['changed'] = ! $plan['model'] || $plan['model']->fill($plan['attributes'])->isDirty();
            $statuses[$plan['line']] ??= ! $plan['model'] ? 'create' : ($plan['changed'] || $groups[$plan['item_key']]['changed'] ? 'update' : 'unchanged');
        }
        unset($plan);
        $counts = array_count_values($statuses);

        return ['summary' => ['file_name' => $fileName, 'total_rows' => count($rows), 'create_count' => $counts['create'] ?? 0, 'update_count' => $counts['update'] ?? 0, 'unchanged_count' => $counts['unchanged'] ?? 0, 'error_count' => $counts['error'] ?? 0, 'errors' => $errors, 'statuses' => $statuses, 'rows' => $rows], 'items' => $groups, 'skus' => $skuPlans];
    }

    public function commit(array $rows, string $fileName): array
    {
        return DB::transaction(function () use ($rows, $fileName) {
            $plan = $this->analyze($rows, $fileName, true);
            if ($plan['summary']['error_count'] > 0) {
                throw ValidationException::withMessages(['file' => '登録状況が変わったため取り込めません。再検証してください。']);
            }
            $result = ['created_items' => 0, 'updated_items' => 0, 'created_skus' => 0, 'updated_skus' => 0, 'unchanged' => $plan['summary']['unchanged_count'], 'imported_at' => now()->toISOString()];
            $items = [];
            $nextOrder = [];
            $touched = [];
            foreach ($plan['items'] as $key => $group) {
                $item = $group['model'] ?? new Item;
                if ($group['changed']) {
                    $result[$item->exists ? 'updated_items' : 'created_items']++;
                    $item->fill($group['attributes'])->save();
                }
                $items[$key] = $item;
                $nextOrder[$key] = (int) $item->skus()->max('sort_order');
            }
            foreach ($plan['skus'] as $entry) {
                if ($entry['model'] && $entry['changed']) {
                    $temporary = '__cw_'.Str::uuid();
                    DB::table('skus')->where('id', $entry['model']->id)->update(['child_asin' => null, 'tq_item_no' => $temporary]);
                }
            }
            foreach ($plan['skus'] as $entry) {
                if (! $entry['changed']) {
                    continue;
                }
                $item = $items[$entry['item_key']];
                $sku = $entry['model'];
                if ($sku) {
                    // Refresh after reserving keys so every changed column is restored.
                    $sku->refresh();
                    $result['updated_skus']++;
                } else {
                    $sku = $item->skus()->make();
                    $sku->sort_order = ++$nextOrder[$entry['item_key']];
                    $result['created_skus']++;
                }
                $sku->fill($entry['attributes'])->save();
                $touched[$item->id] = $item;
            }
            foreach ($touched as $item) {
                $item->touch();
            }

            return ['result' => $result, 'summary' => $plan['summary']];
        }, 3);
    }

    private function tqKey(array $row): string
    {
        return json_encode(array_map(fn ($column) => mb_strtolower($row[$column]), ['tq_item_no', 'tq_color_no', 'tq_size']));
    }

    public function csv(array $rows): string
    {
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, "\xEF\xBB\xBF");
        foreach ($rows as $row) {
            $safe = array_map(fn ($value) => preg_match('/^[=+@\-\t\r]/', (string) $value) ? "'".$value : $value, $row);
            fputcsv($stream, $safe, ',', '"', '', "\r\n");
        }
        rewind($stream);
        $text = stream_get_contents($stream);
        fclose($stream);

        return $text;
    }
}
