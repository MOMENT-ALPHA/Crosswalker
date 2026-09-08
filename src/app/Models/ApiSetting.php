<?php

namespace App\Models;

use Database\Factories\ApiSettingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['enabled', 'api_key_hash', 'key_last_four', 'key_issued_at'])]
#[Hidden(['api_key_hash'])]
class ApiSetting extends Model
{
    /** @use HasFactory<ApiSettingFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['enabled' => 'boolean', 'key_issued_at' => 'datetime'];
    }

    public function allowedSources(): HasMany
    {
        return $this->hasMany(ApiAllowedSource::class)->orderBy('id');
    }
}
