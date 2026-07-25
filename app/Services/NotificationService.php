<?php

namespace App\Services;

use App\Models\Job\JobOrder;
use App\Models\Notification\Notification;
use App\Models\User\User;
use App\Models\Vendor\Vendor;
use Illuminate\Support\Facades\Log;

/**
 * --------------------------------------------------------------------------------
 * Notification Service
 * --------------------------------------------------------------------------------
 * Centralises the creation of Notification log entries for key business events
 * (Job Order status changes, Challan dispatches, etc.).
 *
 * In simulation / development mode the record is stored with status = PENDING.
 * In production, this is the place to wire in Meta WhatsApp Business API,
 * Twilio SMS, or similar providers.
 *
 * @package App\Services
 * @author  Development Team
 * @version 1.0.0
 * @since   2026-07-20
 * --------------------------------------------------------------------------------
 */
class NotificationService
{
    /**
     * Human-readable labels for Job Order status codes.
     */
    private static array $statusLabels = [
        JobOrder::STATUS_DRAFT           => 'Draft',
        JobOrder::STATUS_MATERIAL_OUT    => 'Material Out',
        JobOrder::STATUS_WIP             => 'WIP',
        JobOrder::STATUS_READY           => 'Ready',
        JobOrder::STATUS_DISPATCHED_BACK => 'Dispatched Back',
        JobOrder::STATUS_COMPLETED       => 'Completed',
        JobOrder::STATUS_CANCELLED       => 'Cancelled',
    ];

    /**
     * --------------------------------------------------------------------------------
     * Dispatch a notification when a Job Order status changes.
     * --------------------------------------------------------------------------------
     * Determines the correct recipient (vendor or principal) based on who made
     * the change, builds a natural-language message, and persists a Notification
     * record so the in-app log and (future) live channel can pick it up.
     *
     * @param  JobOrder  $jobOrder    The affected job order (with vendor loaded).
     * @param  int       $fromStatus  Previous status integer.
     * @param  int       $toStatus    New status integer.
     * @param  User      $changedBy   The authenticated user who triggered the change.
     * @return void
     * --------------------------------------------------------------------------------
     */
    public static function dispatchJobStatusChange(
        JobOrder $jobOrder,
        int $fromStatus,
        int $toStatus,
        User $changedBy
    ): void {
        try {
            // Ensure vendor relation is loaded
            $jobOrder->loadMissing('vendor');
            $vendor = $jobOrder->vendor;

            $fromLabel = self::$statusLabels[$fromStatus] ?? "Status #{$fromStatus}";
            $toLabel   = self::$statusLabels[$toStatus]   ?? "Status #{$toStatus}";

            // ----------------------------------------------------------------
            // Determine who to notify and what their contact is.
            //
            // Rule:
            //   - If the changer is the VENDOR → notify the PRINCIPAL (workspace
            //     owner). We do not have the principal's phone here, so we log
            //     with recipient_number = null and mark the notification for the
            //     workspace (principalId = workspace owner).
            //   - If the changer is the PRINCIPAL / staff → notify the VENDOR
            //     on their WhatsApp / phone number.
            // ----------------------------------------------------------------
            $isVendorUser = $changedBy->isVendor();

            if ($isVendorUser) {
                // Vendor updated → alert principal in-app (phone TBD in prod)
                $recipientNumber = null; // Principal phone — plug in later
                $recipientEmail  = null;
                $message = sprintf(
                    '🔔 Job Order %s (%s) status changed: %s → %s. Updated by vendor %s.',
                    $jobOrder->order_number,
                    $jobOrder->part_name,
                    $fromLabel,
                    $toLabel,
                    $vendor?->shop_name ?? 'Vendor'
                );
            } else {
                // Principal updated → alert vendor
                $recipientNumber = $vendor?->whatsapp_number ?? $vendor?->phone ?? null;
                $recipientEmail  = $vendor?->email ?? null;
                $message = sprintf(
                    '🔔 Job Order %s (%s) status updated to %s. Please log in to JobTrack to view details.',
                    $jobOrder->order_number,
                    $jobOrder->part_name,
                    $toLabel
                );
            }

            Notification::create([
                'workspace_id'     => $jobOrder->workspace_id,
                'job_order_id'     => $jobOrder->id,
                'vendor_id'        => $vendor?->id,
                'user_id'          => $changedBy->id,
                'channel'          => Notification::CHANNEL_WHATSAPP,
                'type'             => Notification::TYPE_STATUS_UPDATE,
                'recipient_number' => $recipientNumber,
                'recipient_email'  => $recipientEmail,
                'message'          => $message,
                'status'           => Notification::STATUS_PENDING, // Simulated until live API
                'sent_at'          => now(),
            ]);
        } catch (\Throwable $e) {
            // Notification failures must never break the main business flow
            Log::error('NotificationService::dispatchJobStatusChange failed: ' . $e->getMessage());
        }
    }

    /**
     * --------------------------------------------------------------------------------
     * Dispatch a notification when a Delivery Challan is acknowledged by a vendor.
     * --------------------------------------------------------------------------------
     *
     * @param  mixed  $challan     The DeliveryChallan model instance.
     * @param  User   $changedBy   The user who acknowledged it.
     * @return void
     * --------------------------------------------------------------------------------
     */
    public static function dispatchChallanAcknowledged($challan, User $changedBy): void
    {
        try {
            $challan->loadMissing('vendor');
            $vendor = $challan->vendor;

            $message = sprintf(
                '✅ Delivery Challan %s has been acknowledged by %s. All dispatched parts confirmed received.',
                $challan->challan_number,
                $vendor?->shop_name ?? 'Vendor'
            );

            Notification::create([
                'workspace_id'     => $challan->workspace_id,
                'job_order_id'     => $challan->job_order_id,
                'vendor_id'        => $vendor?->id,
                'user_id'          => $changedBy->id,
                'channel'          => Notification::CHANNEL_WHATSAPP,
                'type'             => Notification::TYPE_DC_GENERATED,
                'recipient_number' => null, // Principal phone — plug in later
                'recipient_email'  => null,
                'message'          => $message,
                'status'           => Notification::STATUS_PENDING,
                'sent_at'          => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('NotificationService::dispatchChallanAcknowledged failed: ' . $e->getMessage());
        }
    }
}
