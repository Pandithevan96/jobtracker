<?php

namespace App\Events;

use App\Models\Job\JobOrderNote;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderNoteCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $jobOrderId,
        public readonly array $note
    ) {}

    /**
     * Broadcast on the private channel for this job order.
     * Channel name: job-order.{id}
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("job-order.{$this->jobOrderId}"),
        ];
    }

    /**
     * The event name that Echo listens for on the client.
     */
    public function broadcastAs(): string
    {
        return 'note.created';
    }

    /**
     * The data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'note' => $this->note,
        ];
    }
}
