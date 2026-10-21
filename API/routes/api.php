<?php

use App\Http\Controllers\Api\Admin\AuditController;
use App\Http\Controllers\Api\Admin\UserManagementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DonationController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\HomeVideoController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\PastoralContentController;
use App\Http\Controllers\Api\PastoralVisitController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SacramentController;
use App\Http\Controllers\Api\ScheduleController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/social/complete', [AuthController::class, 'completeSocialLogin'])->middleware('throttle:login');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware('throttle:6,1');

Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->name('verification.verify')
    ->middleware('signed');

Route::get('/media/{name}', [\App\Http\Controllers\Api\MediaUploadController::class, 'file'])->name('media.file');
Route::get('/medios/videos', [PastoralContentController::class, 'videos']);
Route::get('/inicio/video', [HomeVideoController::class, 'show']);
Route::get('/inicio/video/archivo', [HomeVideoController::class, 'file'])->name('home-video.file');
Route::get('/medios/publicaciones', [PastoralContentController::class, 'publicaciones']);
Route::get('/contenido-pastoral', [PastoralContentController::class, 'pastoralContents']);
Route::get('/articulos', [PastoralContentController::class, 'articulos']);
Route::get('/ninos-jovenes', [PastoralContentController::class, 'ninosJovenes']);
Route::get('/ninos-jovenes/{recurso}', [PastoralContentController::class, 'showNinosJovenes']);
Route::get('/calendarios/eventos', [EventController::class, 'index']);
Route::get('/calendarios/visitas', [PastoralVisitController::class, 'index']);
Route::get('/horarios', [ScheduleController::class, 'index']);

Route::get('/sacramentos/verificar/{sacrament}', [SacramentController::class, 'verifyPublicCertificate']);
Route::post('/finanzas/donaciones/public', [DonationController::class, 'publicDonation'])
    ->middleware('throttle:public-donation');
Route::get('/finanzas/donaciones/public/{donation}/estado', [DonationController::class, 'publicStatus'])->middleware('throttle:60,1');
Route::get('/finanzas/donaciones/public/{donation}/comprobante', [DonationController::class, 'publicReceipt']);

Route::middleware(['auth:sanctum', 'token_fresh_api', 'active_api', 'activity_api'])->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::middleware('verified')->group(function (): void {
        Route::get('/notificaciones', [\App\Http\Controllers\Api\TicketNotificationController::class, 'index']);
        Route::patch('/notificaciones/{id}/leida', [\App\Http\Controllers\Api\TicketNotificationController::class, 'read']);
        Route::post('/sacramentos/solicitar-certificado', [TicketController::class, 'storeDocument'])->middleware('throttle:certificate-request');
        Route::get('/tickets/mios', [TicketController::class, 'mine']);
        Route::get('/tickets/{ticket}/documento', [TicketController::class, 'document']);
        Route::get('/miembros/me', [MemberController::class, 'myProfile']);
        Route::put('/miembros/me', [MemberController::class, 'updateMyProfile']);
        Route::post('/miembros/me', [MemberController::class, 'updateMyProfile']);
        Route::get('/sacramentos/mis-registros', [SacramentController::class, 'myRecords']);
        Route::get('/finanzas/donaciones/mias', [DonationController::class, 'myDonations']);
        Route::get('/finanzas/donaciones/{donation}/mi-comprobante', [DonationController::class, 'myReceipt']);
    });

    Route::middleware(['verified', 'role_api:editor,admin'])->group(function (): void {
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::get('/tickets/{ticket}/comprobante', [TicketController::class, 'proof']);
        Route::get('/tickets/{ticket}', [TicketController::class, 'show']);
        Route::patch('/tickets/{ticket}', [TicketController::class, 'update']);
        Route::get('/inicio/videos', [HomeVideoController::class, 'index'])->middleware('role_api:admin');
        Route::put('/inicio/videos', [HomeVideoController::class, 'configure'])->middleware('role_api:admin');
        Route::post('/inicio/video', [HomeVideoController::class, 'update'])->middleware('role_api:admin');
        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

        Route::get('/sacramentos', [SacramentController::class, 'index']);
        Route::post('/sacramentos', [SacramentController::class, 'store']);
        Route::put('/sacramentos/{sacrament}', [SacramentController::class, 'update']);
        Route::get('/sacramentos/{sacrament}/certificado', [SacramentController::class, 'certificate']);

        Route::get('/miembros', [MemberController::class, 'index']);
        Route::post('/miembros', [MemberController::class, 'store']);
        Route::put('/miembros/{member}', [MemberController::class, 'update']);

        Route::post('/calendarios/eventos', [EventController::class, 'store']);
        Route::put('/calendarios/eventos/{event}', [EventController::class, 'update']);
        Route::get('/calendarios/eventos/{event}/asistencias', [EventController::class, 'attendanceIndex']);
        Route::post('/calendarios/eventos/{event}/asistencias', [EventController::class, 'attendanceStore']);
        Route::post('/calendarios/visitas', [PastoralVisitController::class, 'store']);
        Route::put('/calendarios/visitas/{visit}', [PastoralVisitController::class, 'update']);

        Route::get('/finanzas/donaciones', [DonationController::class, 'index']);
        Route::post('/finanzas/donaciones', [DonationController::class, 'store']);
        Route::put('/finanzas/donaciones/{donation}', [DonationController::class, 'update']);
        Route::get('/finanzas/donaciones/{donation}/comprobante', [DonationController::class, 'receipt']);
        Route::get('/finanzas/donaciones/{donation}/foto-comprobante', [DonationController::class, 'proof']);

        Route::post('/media', [\App\Http\Controllers\Api\MediaUploadController::class, 'store'])->middleware('throttle:20,1');
        Route::post('/medios/videos', [PastoralContentController::class, 'storeVideo']);
        Route::post('/medios/publicaciones', [PastoralContentController::class, 'storePublicacion']);
        Route::put('/medios/publicaciones/{publicacion}', [PastoralContentController::class, 'updatePublicacion']);
        Route::post('/contenido-pastoral', [PastoralContentController::class, 'storePastoral']);
        Route::put('/contenido-pastoral/{contenido}', [PastoralContentController::class, 'updatePastoral']);
        Route::post('/articulos', [PastoralContentController::class, 'storeArticulo']);
        Route::put('/articulos/{articulo}', [PastoralContentController::class, 'updateArticulo']);
        Route::post('/ninos-jovenes', [PastoralContentController::class, 'storeNinosJovenes']);
        Route::put('/ninos-jovenes/{recurso}', [PastoralContentController::class, 'updateNinosJovenes']);
        Route::post('/horarios', [ScheduleController::class, 'store']);
        Route::put('/horarios/{schedule}', [ScheduleController::class, 'update']);

        Route::get('/reportes/summary', [ReportController::class, 'summary']);
        Route::get('/reportes/export/sacramentos.csv', [ReportController::class, 'exportSacramentsCsv']);
        Route::get('/reportes/export/finanzas.csv', [ReportController::class, 'exportFinancialCsv']);
        Route::get('/reportes/export/sacramentos.xlsx', [ReportController::class, 'exportSacramentsXlsx']);
        Route::get('/reportes/export/finanzas.xlsx', [ReportController::class, 'exportFinancialXlsx']);
        Route::get('/reportes/export/sacramentos.pdf', [ReportController::class, 'exportSacramentsPdf']);
        Route::get('/reportes/export/finanzas.pdf', [ReportController::class, 'exportFinancialPdf']);
    });

    Route::middleware(['verified', 'role_api:admin'])->group(function (): void {
        Route::delete('/sacramentos/{sacrament}', [SacramentController::class, 'destroy']);
        Route::delete('/miembros/{member}', [MemberController::class, 'destroy']);
        Route::delete('/calendarios/eventos/{event}', [EventController::class, 'destroy']);
        Route::delete('/calendarios/visitas/{visit}', [PastoralVisitController::class, 'destroy']);
        Route::delete('/finanzas/donaciones/{donation}', [DonationController::class, 'destroy']);
        Route::delete('/contenido-pastoral/{contenido}', [PastoralContentController::class, 'deletePastoral']);
        Route::delete('/medios/videos/{video}', [PastoralContentController::class, 'deleteVideo']);
        Route::delete('/medios/publicaciones/{publicacion}', [PastoralContentController::class, 'deletePublicacion']);
        Route::delete('/articulos/{articulo}', [PastoralContentController::class, 'deleteArticulo']);
        Route::delete('/ninos-jovenes/{recurso}', [PastoralContentController::class, 'deleteNinosJovenes']);
        Route::delete('/horarios/{schedule}', [ScheduleController::class, 'destroy']);

        Route::prefix('admin')->group(function (): void {
            Route::get('/roles', [UserManagementController::class, 'roles']);
            Route::get('/users', [UserManagementController::class, 'index']);
            Route::patch('/users/{user}/role', [UserManagementController::class, 'updateRole']);
            Route::patch('/users/{user}/status', [UserManagementController::class, 'updateStatus']);
            Route::patch('/users/{user}/activity-block', [UserManagementController::class, 'updateActivityBlock']);
            Route::delete('/users/{user}', [UserManagementController::class, 'destroy']);
            Route::get('/audit-logs', [AuditController::class, 'index']);
            Route::get('/audit-logs/export', [AuditController::class, 'export']);
        });
    });
});
