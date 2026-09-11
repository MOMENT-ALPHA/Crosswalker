<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Sku;
use App\Models\User;
use App\Services\CsvImportService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CsvImportTest extends TestCase
{
    use LazilyRefreshDatabase;

    private function prepare(): void
    {
        $this->actingAs(User::factory()->create());
        Brand::factory()->create(['name' => '栞']);
        Category::factory()->create(['name' => '老眼鏡']);
    }

    private function row(array $values = []): array
    {
        return array_replace(['item_no' => '0001', 'category_name' => '老眼鏡', 'brand_name' => '栞', 'parent_asin' => '', 'item_status' => '', 'sku_code' => '0001-01-00', 'child_asin' => '', 'sku_status' => '', 'tq_item_no' => '0001', 'tq_color_no' => '01', 'tq_size' => '00'], $values);
    }

    private function validateRows(array $rows): TestResponse
    {
        $text = app(CsvImportService::class)->csv([CsvImportService::COLUMNS, ...array_map(fn ($row) => array_values($row), $rows)]);

        return $this->postJson('/api/admin/csv/validate', ['file' => UploadedFile::fake()->createWithContent('import.csv', $text)]);
    }

    public function test_import_preserves_zeros_and_omitted_statuses_and_can_be_repeated(): void
    {
        $this->prepare();
        $summary = $this->validateRows([$this->row(['tq_size' => '']), $this->row(['sku_code' => '0001-01-05', 'tq_size' => '05', 'item_status' => '0', 'sku_status' => '0'])])->assertOk()->assertJsonPath('error_count', 0);
        $this->assertDatabaseCount('items', 0);
        $token = $summary->json('validation_id');
        $this->postJson('/api/admin/csv/import', ['validation_id' => $token])->assertOk()->assertJsonPath('created_items', 1)->assertJsonPath('created_skus', 2);
        $this->assertDatabaseHas('items', ['item_no' => '0001', 'is_active' => false]);
        $this->assertDatabaseHas('skus', ['sku_code' => '0001-01-00', 'tq_color_no' => '01', 'tq_size' => '', 'is_active' => true]);
        $this->postJson('/api/admin/csv/import', ['validation_id' => $token])->assertOk();
        $this->assertDatabaseCount('skus', 2);
        $this->get('/api/admin/csv/'.$token.'/result')->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->validateRows([$this->row(['tq_size' => ''])])->assertOk()->assertJsonPath('unchanged_count', 1);
    }

    public function test_conflicting_item_states_and_duplicate_keys_block_the_entire_file(): void
    {
        $this->prepare();
        $summary = $this->validateRows([$this->row(['item_status' => '1']), $this->row(['item_status' => '0'])])->assertOk();
        $this->assertGreaterThan(0, $summary->json('error_count'));
        $this->postJson('/api/admin/csv/import', ['validation_id' => $summary->json('validation_id')])->assertUnprocessable();
        $this->assertDatabaseCount('items', 0);
        $this->assertDatabaseCount('skus', 0);
    }

    public function test_import_revalidates_new_conflicts_and_does_not_commit_other_rows(): void
    {
        $this->prepare();
        $summary = $this->validateRows([$this->row(), $this->row(['item_no' => '0002', 'sku_code' => '0002', 'tq_item_no' => '0002', 'child_asin' => 'COLLISION'])])->assertOk();
        Sku::factory()->create(['child_asin' => 'COLLISION']);
        $this->postJson('/api/admin/csv/import', ['validation_id' => $summary->json('validation_id')])->assertUnprocessable();
        $this->assertDatabaseMissing('items', ['item_no' => '0001']);
    }

    public function test_other_users_cannot_use_validation_or_download_results(): void
    {
        $this->prepare();
        $summary = $this->validateRows([$this->row()])->assertOk();
        $token = $summary->json('validation_id');
        $this->actingAs(User::factory()->create());
        $this->postJson('/api/admin/csv/import', ['validation_id' => $token])->assertNotFound();
        $this->getJson('/api/admin/csv/'.$token.'/result')->assertNotFound();
    }

    public function test_malformed_csv_and_unknown_master_are_rejected(): void
    {
        $this->prepare();
        $this->postJson('/api/admin/csv/validate', ['file' => UploadedFile::fake()->createWithContent('broken.csv', "item_no\n\"unterminated")])->assertUnprocessable();
        $this->validateRows([$this->row(['brand_name' => '不明'])])->assertOk()->assertJsonPath('errors.0.column', 'brand_name');
        $this->validateRows([$this->row(['item_status' => 'active', 'sku_status' => 'inactive'])])->assertOk()->assertJsonPath('error_count', 1)->assertJsonCount(2, 'errors')->assertJsonPath('errors.0.column', 'item_status')->assertJsonPath('errors.1.column', 'sku_status');
        $this->get('/api/admin/csv/template')->assertOk()->assertDontSee('memo');
    }

    public function test_failure_during_second_sku_rolls_back_the_entire_import(): void
    {
        $this->prepare();
        $summary = $this->validateRows([$this->row(), $this->row(['item_no' => '0002', 'sku_code' => 'fail-second', 'tq_item_no' => '0002'])])->assertOk();
        Sku::creating(function (Sku $sku): void {
            if ($sku->sku_code === 'fail-second') {
                throw new \RuntimeException('Internal storage failure');
            }
        });

        try {
            $this->postJson('/api/admin/csv/import', ['validation_id' => $summary->json('validation_id')])
                ->assertInternalServerError()->assertExactJson(['message' => 'サーバーエラーが発生しました。']);
            $this->assertDatabaseCount('items', 0);
            $this->assertDatabaseCount('skus', 0);
        } finally {
            Sku::flushEventListeners();
        }
    }

    public function test_expired_validation_requires_uploading_again(): void
    {
        $this->prepare();
        $summary = $this->validateRows([$this->row()])->assertOk();
        $this->travel(31)->minutes();
        $this->postJson('/api/admin/csv/import', ['validation_id' => $summary->json('validation_id')])->assertNotFound();
        $this->assertDatabaseCount('items', 0);
    }
}
