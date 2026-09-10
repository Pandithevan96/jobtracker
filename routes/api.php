<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    /**
     * --------------------------------------------------------------------------------
     * Auth Routes
     * --------------------------------------------------------------------------------
     * This route is used to handle the auth requests.
     *
     * @author  Development Team
     *
     * @version 1.0.0
     *
     * @since 2026-07-03
     * --------------------------------------------------------------------------------
     */
    Route::prefix('auth')->group(function () {
        Route::post('register',        'Auth\AuthController@register');
        Route::post('login',           'Auth\AuthController@login');
        Route::post('forgot-password', 'Auth\AuthController@forgotPassword');
        Route::post('verify-otp',      'Auth\AuthController@verifyOtp');
        Route::post('reset-password',  'Auth\AuthController@resetPassword');
    });

    // Public Razorpay Webhook
    Route::post('subscriptions/webhook', 'Subscription\SubscriptionController@webhook');

    // Public WhatsApp Bot Webhook
    Route::post('whatsapp/webhook', 'Notification\WhatsappBotController@webhook');

    // Public Challan PDF Stream Route (opens PDF directly in browser tab)
    Route::get('challans/pdf/{id}', 'Challan\DeliveryChallanController@streamPdf');

    /*
    |--------------------------------------------------------------------------
    | Protected Routes (Bearer token required)
    |--------------------------------------------------------------------------
    */
    Route::middleware('auth:sanctum')->group(function () {

        // Broadcasting Channel Authorization Endpoint (Sanctum Auth)
        \Illuminate\Support\Facades\Broadcast::routes();

        Route::post('logout',          'Auth\AuthController@logout');
        Route::post('me',              'Auth\AuthController@me');
        Route::post('change-password', 'Auth\AuthController@changePassword');

        // Workspace Routes
        Route::prefix('workspaces')->group(function () {
            Route::post('create',      'Workspace\WorkspaceController@store');
            Route::post('list',        'Workspace\WorkspaceController@list');
            Route::post('details',     'Workspace\WorkspaceController@show');
            Route::post('update',      'Workspace\WorkspaceController@update');
            Route::post('upload-logo',        'Workspace\WorkspaceController@uploadLogo');
            Route::post('available-vendors',  'Workspace\WorkspaceController@availableVendors');
        });

        // Vendor Routes
        Route::prefix('vendors')->group(function () {
            Route::post('create',          'Vendor\VendorController@store');
            Route::post('list',            'Vendor\VendorController@list');
            Route::post('details',         'Vendor\VendorController@details');
            Route::post('update',          'Vendor\VendorController@update');
            Route::post('link-user',       'Vendor\VendorController@linkUser');
            Route::get('recommendations',  'Vendor\VendorRecommendationController@index');
            Route::post('recommendations', 'Vendor\VendorRecommendationController@index');
        });

        // Job Order Routes
        Route::prefix('job-orders')->group(function () {
            Route::post('create',           'Job\JobOrderController@store');
            Route::post('list',             'Job\JobOrderController@list');
            Route::post('details',          'Job\JobOrderController@details');
            Route::post('update-status',    'Job\JobOrderController@updateStatus');
            Route::post('upload-document',  'Job\JobOrderController@uploadDocument');
            Route::post('add-note',              'Job\JobOrderController@addNote');
            Route::post('notes',                 'Job\JobOrderController@getNotes');
            Route::post('extract-drawing-specs', 'Job\DrawingSpecController@extract');
        });

        Route::prefix('challans')->group(function () {
            Route::post('create',       'Challan\DeliveryChallanController@store');
            Route::post('list',         'Challan\DeliveryChallanController@list');
            Route::post('details',      'Challan\DeliveryChallanController@details');
            Route::post('update',       'Challan\DeliveryChallanController@update');
            Route::post('acknowledge',  'Challan\DeliveryChallanController@acknowledge');
            Route::post('cancel',       'Challan\DeliveryChallanController@cancel');
            Route::post('download-pdf', 'Challan\DeliveryChallanController@downloadPdf');
        });

        // Quality Rejection Routes
        Route::prefix('rejections')->group(function () {
            Route::post('create',      'Job\QualityRejectionController@store');
            Route::post('list',        'Job\QualityRejectionController@list');
            Route::post('details',     'Job\QualityRejectionController@details');
            Route::post('acknowledge', 'Job\QualityRejectionController@acknowledge');
            Route::post('close',       'Job\QualityRejectionController@close');
            Route::post('classify',    'Job\QualityRejectionController@classify');
            Route::post('confirm-ai',  'Job\QualityRejectionController@confirmAi');
        });

        // Material Reconciliation & Anomaly Routes
        Route::get('job-orders/{id}/reconciliation', 'Job\MaterialAnomalyController@showJobReconciliation');
        Route::post('job-orders/{id}/reconciliation', 'Job\MaterialAnomalyController@showJobReconciliation');

        Route::prefix('reconciliations')->group(function () {
            Route::post('create',      'Job\MaterialReconciliationController@store');
            Route::post('list',        'Job\MaterialReconciliationController@list');
            Route::post('details',     'Job\MaterialReconciliationController@details');
        });

        Route::prefix('material-anomalies')->group(function () {
            Route::get('/',        'Job\MaterialAnomalyController@index');
            Route::post('/',       'Job\MaterialAnomalyController@index');
            Route::post('resolve', 'Job\MaterialAnomalyController@resolve');
        });

        // Delay Risk Routes
        Route::get('job-orders/{id}/delay-risk', 'Job\DelayRiskController@showJobRisk');
        Route::post('job-orders/{id}/delay-risk', 'Job\DelayRiskController@showJobRisk');

        Route::prefix('delay-risks')->group(function () {
            Route::get('/',  'Job\DelayRiskController@index');
            Route::post('/', 'Job\DelayRiskController@index');
        });

        // Job Work Tax Invoice Routes
        Route::prefix('invoices')->group(function () {
            Route::post('create',        'Billing\JobWorkInvoiceController@store');
            Route::post('list',          'Billing\JobWorkInvoiceController@list');
            Route::post('details',       'Billing\JobWorkInvoiceController@details');
            Route::post('update-status', 'Billing\JobWorkInvoiceController@updateStatus');
        });

        // Form GST ITC-04 Report Routes
        Route::prefix('reports')->group(function () {
            Route::post('itc04',            'Report\GstItc04Controller@getReport');
            Route::post('itc04/export-csv', 'Report\GstItc04Controller@exportCsv');
        });

        // Subscription Routes
        Route::prefix('subscriptions')->group(function () {
            Route::post('status',      'Subscription\SubscriptionController@status');
            Route::post('upgrade',     'Subscription\SubscriptionController@upgrade');
            Route::post('invoices',    'Subscription\SubscriptionController@invoices');
        });

        // Notification Logs Routes
        Route::prefix('notifications')->group(function () {
            Route::post('list',          'Notification\NotificationController@list');
            Route::post('send-test',     'Notification\NotificationController@sendTest');
            Route::post('unread-count',  'Notification\NotificationController@unreadCount');
        });

        // WhatsApp Bot Logs
        Route::prefix('whatsapp')->group(function () {
            Route::post('logs',        'Notification\WhatsappBotController@logs');
        });
    });
});
