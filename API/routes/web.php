<?php

use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('auth/google')->group(function (): void {
    Route::get('/redirect', [SocialAuthController::class, 'redirectToGoogle'])->name('auth.google.redirect');
    Route::get('/callback', [SocialAuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');
});
