<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateUser extends Command
{
    protected $signature = 'crosswalker:create-user {login_id} {--name= : 表示名}';

    protected $description = 'Web利用者を登録する（パスワードは非表示で入力）';

    public function handle(): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('パスワードを安全に入力するため対話モードで実行してください。');

            return self::FAILURE;
        }
        $password = $this->secret('パスワード（12文字以上）');
        $confirmation = $this->secret('パスワード（確認）');
        $data = ['login_id' => trim($this->argument('login_id')), 'name' => $this->option('name') ?: $this->argument('login_id'), 'password' => $password, 'password_confirmation' => $confirmation];
        $validator = Validator::make($data, ['login_id' => ['required', 'string', 'max:255', 'unique:users'], 'name' => ['required', 'string', 'max:255'], 'password' => ['required', 'string', 'min:12', 'max:72', 'confirmed']]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }
        User::create($validator->safe()->except('password_confirmation'));
        $this->info('Web利用者を登録しました。');

        return self::SUCCESS;
    }
}
