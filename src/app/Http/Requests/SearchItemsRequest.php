<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['keyword' => ['nullable', 'string', 'max:255'], 'brand_id' => ['nullable', 'integer', 'min:1'], 'category_id' => ['nullable', 'integer', 'min:1'], 'status' => ['nullable', Rule::in(['active', 'inactive', 'all'])], 'filter' => ['nullable', Rule::in(['no_parent_asin', 'no_child_asin'])], 'page' => ['nullable', 'integer', 'min:1'], 'per_page' => ['nullable', 'integer', 'between:1,100']];
    }
}
