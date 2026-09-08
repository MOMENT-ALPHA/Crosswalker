<?php

namespace App\Models;

use Database\Factories\ApiAllowedSourceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['value', 'memo'])]
class ApiAllowedSource extends Model
{
    /** @use HasFactory<ApiAllowedSourceFactory> */
    use HasFactory;

    public function apiSetting(): BelongsTo
    {
        return $this->belongsTo(ApiSetting::class);
    }
}
