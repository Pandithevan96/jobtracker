<?php

namespace App\Events;

use App\Models\Job\DelayRiskScore;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DelayRiskUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly DelayRiskScore $riskScore
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("workspace.{$this->riskScore->workspace_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'delay.risk.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'risk' => [
                'id'                   => $this->riskScore->id,
                'job_order_id'         => $this->riskScore->job_order_id,
                'vendor_id'            => $this->riskScore->vendor_id,
                'risk_score'           => $this->riskScore->risk_score,
                'risk_level'           => $this->riskScore->risk_level,
                'delay_probability'    => $this->riskScore->delay_probability,
                'estimated_delay_days' => $this->riskScore->estimated_delay_days,
                'risk_factors'         => $this->riskScore->risk_factors,
                'calculated_at'        => $this->riskScore->calculated_at?->toIso8601String(),
            ],
        ];
    }
}
