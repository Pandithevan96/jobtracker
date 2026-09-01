<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

/*
 * Private channel for a specific Job Order's chat.
 * Only users who are members of the related workspace
 * (owner, workspace members, or the assigned vendor) may subscribe.
 *
 * Channel name: job-order.{id}
 */
Broadcast::channel('job-order.{jobOrderId}', function ($user, int $jobOrderId) {
    $jobOrder = \App\Models\Job\JobOrder::find($jobOrderId);
    if (!$jobOrder) {
        return false;
    }

    // Allow workspace owner or workspace members
    $workspace = \App\Models\Workspace\Workspace::where('id', $jobOrder->workspace_id)
        ->where(function ($q) use ($user) {
            $q->where('owner_id', $user->id)
              ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
        })
        ->first();

    if ($workspace) {
        return [
            'id'   => $user->id,
            'name' => $user->name,
            'role' => $user->isVendor() ? 'vendor' : 'principal',
        ];
    }

    // Allow the assigned vendor (if vendor user)
    if ($user->isVendor() && $jobOrder->vendor_id) {
        $vendor = \App\Models\Vendor\Vendor::where('id', $jobOrder->vendor_id)
            ->where('user_id', $user->id)
            ->first();
        if ($vendor) {
            return [
                'id'   => $user->id,
                'name' => $user->name,
                'role' => 'vendor',
            ];
        }
    }

    return false;
});
