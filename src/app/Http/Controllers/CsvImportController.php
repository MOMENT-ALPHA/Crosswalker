<?php

namespace App\Http\Controllers;

use App\Services\CsvImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CsvImportController extends Controller
{
    public function template(CsvImportService $csv): Response
    {
        return response($csv->csv([CsvImportService::COLUMNS]), 200, ['Content-Type' => 'text/csv; charset=UTF-8', 'Content-Disposition' => 'attachment; filename="crosswalker_template.csv"']);
    }

    public function validateFile(Request $request, CsvImportService $csv): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'extensions:csv', 'mimetypes:text/plain,text/csv,application/csv,application/vnd.ms-excel', 'max:5120']]);
        $file = $request->file('file');
        $rows = $csv->parse($file->get());
        $summary = $csv->analyze($rows, $file->getClientOriginalName())['summary'];
        $token = (string) Str::uuid();
        Cache::put('csv:'.$token, ['user_id' => $request->user()->id, 'summary' => $summary, 'result' => null], now()->addMinutes(30));

        return response()->json(array_merge($summary, ['validation_id' => $token]));
    }

    public function import(Request $request, CsvImportService $csv): JsonResponse
    {
        $data = $request->validate(['validation_id' => ['required', 'uuid']]);
        $token = $data['validation_id'];

        return Cache::lock('csv-import:'.$token, 120)->block(5, function () use ($request, $csv, $token) {
            $stored = $this->stored($request, $token);
            abort_if($stored['summary']['error_count'] > 0, 422, 'エラーのあるCSVは取り込めません。');
            if ($stored['result'] === null) {
                $outcome = $csv->commit($stored['summary']['rows'], $stored['summary']['file_name']);
                $stored = array_merge($stored, $outcome);
                Cache::put('csv:'.$token, $stored, now()->addMinutes(30));
            }

            return response()->json($stored['result']);
        });
    }

    public function result(Request $request, string $token, CsvImportService $csv): Response
    {
        $stored = $this->stored($request, $token);
        $summary = $stored['summary'];
        $rows = [['line', 'item_no', 'sku_code', 'result', 'message']];
        foreach ($summary['rows'] as $row) {
            $messages = collect($summary['errors'])->where('line', $row['__line'])->map(fn ($error) => $error['column'].': '.$error['message'])->implode(' / ');
            $rows[] = [$row['__line'], $row['item_no'], $row['sku_code'], $summary['statuses'][$row['__line']] ?? 'error', $messages];
        }

        return response($csv->csv($rows), 200, ['Content-Type' => 'text/csv; charset=UTF-8', 'Content-Disposition' => 'attachment; filename="crosswalker_result.csv"']);
    }

    private function stored(Request $request, string $token): array
    {
        $stored = Cache::get('csv:'.$token);
        abort_unless($stored && $stored['user_id'] === $request->user()->id, 404, '検証結果が見つからないか、有効期限が切れています。再検証してください。');

        return $stored;
    }
}
