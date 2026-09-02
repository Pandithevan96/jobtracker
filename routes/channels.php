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
 * Allows any authenticated user (principal or vendor) to listen to live order updates.
 *
 * Channel name: job-order.{id}
 */
Broadcast::channel('job-order.{jobOrderId}', function ($user, $jobOrderId) {
    if (!$user) {
        return false;
    }

    return [
        'id'   => $user->id,
        'name' => $user->name,
    ];
});
