<?php

use Illuminate\Support\Facades\Route;

// SPAのエントリ。画面遷移はVue Router側で処理する。
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
