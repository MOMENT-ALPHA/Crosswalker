<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    public function csrf(Request $request): JsonResponse
    {
        return response()->json(['token' => $request->session()->token()])->header('Cache-Control', 'no-store');
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['login_id' => ['required', 'string', 'max:255'], 'password' => ['required', 'string', 'max:255']]);
        if (! Auth::attempt($credentials)) {
            return response()->json(['message' => 'ログインIDまたはパスワードが正しくありません。'], 401);
        }
        $request->session()->regenerate();

        return $this->me($request);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->only(['id', 'login_id', 'name'])])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
