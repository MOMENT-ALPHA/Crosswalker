<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'item_no' => ['required', 'string', 'max:255'],
            'brand_id' => ['required', 'integer', 'exists:brands,id'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'parent_asin' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
            'skus' => ['required', 'array', 'list', 'min:1', 'max:1000'],
            'skus.*' => ['array:id,sku_code,child_asin,tq_item_no,tq_color_no,tq_size,is_active'],
            'skus.*.id' => ['nullable', 'integer', 'min:1', 'distinct'],
            'skus.*.sku_code' => ['required', 'string', 'max:255'],
            'skus.*.child_asin' => ['nullable', 'string', 'max:255'],
            'skus.*.tq_item_no' => ['required', 'string', 'max:255'],
            'skus.*.tq_color_no' => ['required', 'string', 'max:255'],
            'skus.*.tq_size' => ['required', 'string', 'max:255'],
            'skus.*.is_active' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return ['required' => '必須項目です。', 'string' => '文字列で入力してください。', 'max' => '入力値が上限を超えています。', 'exists' => '登録済みの項目を選択してください。', 'skus.min' => 'SKUを1行以上入力してください。', 'skus.*.id.distinct' => '同じSKUを複数行に指定できません。'];
    }
}
