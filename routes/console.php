<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Job\JobOrder;
use App\Models\Notification\Notification;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('job-orders:send-due-reminders', function () {
    $today = now()->startOfDay();
    $tomorrow = $today->copy()->addDay();
    $created = 0;

    JobOrder::with(['vendor', 'workspace'])
        ->whereNotIn('status', [JobOrder::STATUS_DRAFT, JobOrder::STATUS_COMPLETED, JobOrder::STATUS_CANCELLED])
        ->whereDate('due_date', '<=', $tomorrow->toDateString())
        ->orderBy('id')
        ->chunkById(100, function ($orders) use ($today, &$created) {
            foreach ($orders as $order) {
                $alreadyRemindedToday = Notification::where('job_order_id', $order->id)
                    ->where('type', Notification::TYPE_DUE_REMINDER)
                    ->where('created_at', '>=', $today)
                    ->exists();

                if ($alreadyRemindedToday) {
                    continue;
                }

                $dueDate = $order->due_date?->copy()->startOfDay();
                $overdueDays = $dueDate?->diffInDays(now()->startOfDay(), false) ?? 0;
                $dueLabel = $order->due_date?->format('d M Y') ?? 'not set';
                $timing = $overdueDays > 0
                    ? "is overdue by {$overdueDays} day(s)"
                    : ($overdueDays === 0 ? 'is due today' : 'is due tomorrow');
                $statusLabel = match ($order->status) {
                    JobOrder::STATUS_DRAFT => 'Draft',
                    JobOrder::STATUS_MATERIAL_OUT => 'Material Out',
                    JobOrder::STATUS_WIP => 'In Progress',
                    JobOrder::STATUS_READY => 'Ready',
                    JobOrder::STATUS_DISPATCHED_BACK => 'Dispatched Back',
                    default => 'Active',
                };

                Notification::create([
                    'workspace_id' => $order->workspace_id,
                    'job_order_id' => $order->id,
                    'vendor_id' => $order->vendor_id,
                    'user_id' => $order->vendor?->user_id,
                    'channel' => Notification::CHANNEL_PUSH,
                    'type' => Notification::TYPE_DUE_REMINDER,
                    'message' => "Follow up: job order {$order->order_number} for {$order->part_name} at {$order->vendor?->shop_name} {$timing} (due {$dueLabel}). Current status: {$statusLabel}.",
                    'status' => Notification::STATUS_PENDING,
                ]);

                $created++;
            }
        });

    $this->info("Created {$created} due-date follow-up notification(s).");
})->purpose('Create daily in-app follow-up notifications for due and overdue job orders');

Schedule::command('job-orders:send-due-reminders')
    ->dailyAt('08:00')
    ->timezone('Asia/Kolkata');
