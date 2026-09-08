<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Category;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class MasterController extends Controller
{
    private function model(string $master): Model
    {
        return $master === 'brands' ? new Brand : new Category;
    }

    public function index(string $master): JsonResponse
    {
        return response()->json(['data' => $this->model($master)->newQuery()->withCount('items')->orderBy('name')->get()]);
    }

    public function store(Request $request, string $master): JsonResponse
    {
        $model = $this->model($master);
        $data = $this->validateName($request, $model);

        return response()->json(['data' => $model->newQuery()->create($data)->loadCount('items')], 201);
    }

    public function update(Request $request, string $master, int $id): JsonResponse
    {
        $model = $this->model($master)->newQuery()->findOrFail($id);
        $model->update($this->validateName($request, $model));

        return response()->json(['data' => $model->loadCount('items')]);
    }

    public function destroy(string $master, int $id): Response
    {
        DB::transaction(function () use ($master, $id) {
            $model = $this->model($master)->newQuery()->lockForUpdate()->findOrFail($id);
            $count = $model->items()->count();
            if ($count > 0) {
                throw ValidationException::withMessages(['name' => "{$count}件の品番で使用されているため削除できません。"]);
            }
            $model->delete();
        });

        return response()->noContent();
    }

    private function validateName(Request $request, Model $model): array
    {
        $name = $request->input('name');
        if (is_string($name)) {
            $request->merge(['name' => preg_replace('/^\\s+|\\s+$/u', '', $name)]);
        }

        return $request->validate(['name' => ['required', 'string', 'max:255', Rule::unique($model->getTable())->ignore($model->getKey())]]);
    }
}
