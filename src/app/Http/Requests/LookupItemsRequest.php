<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LookupItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_nos' => ['required', 'array', 'list', 'min:1', 'max:100'],
            'item_nos.*' => ['required', 'string', 'max:255'],
        ];
    }
}
