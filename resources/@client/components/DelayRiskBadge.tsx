import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle2, ShieldAlert, ChevronDown } from 'lucide-react';
import apiClient from '@/services/apiClient';

interface DelayRiskData {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  delay_probability: number;
  estimated_delay_days: number;
  risk_factors: string[];
}

interface DelayRiskBadgeProps {
  jobOrderId?: number;
  initialData?: DelayRiskData | null;
  showDetails?: boolean;
}

export const DelayRiskBadge: React.FC<DelayRiskBadgeProps> = ({
  jobOrderId,
  initialData,
  showDetails = false,
}) => {
  const [data, setData] = useState<DelayRiskData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData && !!jobOrderId);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!initialData && jobOrderId) {
      setLoading(true);
      apiClient
        .get(`/job-orders/${jobOrderId}/delay-risk`)
        .then((res) => {
          const risk = res.data?.data || res.data;
          setData(risk);
        })
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [jobOrderId, initialData]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#888] bg-[#1a1a1a] border border-[#2a2a2a] rounded-full">
        <Clock className="w-3 h-3 animate-spin" /> Calculating Risk...
      </span>
    );
  }

  if (!data) return null;

  const levelMap = {
    low: {
      label: 'Low Delay Risk',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
    },
    medium: {
      label: 'Moderate Delay Risk',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: Clock,
    },
    high: {
      label: 'High Delay Risk',
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      icon: AlertCircle,
    },
    critical: {
      label: 'Critical Delay Risk',
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse',
      icon: ShieldAlert,
    },
  };

  const currentLevel = levelMap[data.risk_level] || levelMap.low;
  const IconComponent = currentLevel.icon;

  return (
    <div className="inline-block relative">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-all hover:brightness-110 ${currentLevel.badgeClass}`}
      >
        <IconComponent className="w-3.5 h-3.5" />
        <span>{currentLevel.label} ({data.risk_score}%)</span>
        {showDetails && <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
      </div>

      {showDetails && expanded && (
        <div className="absolute left-0 mt-2 z-30 w-72 bg-[#18181b] border border-[#27272a] rounded-xl p-4 shadow-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
            <span className="font-bold text-white">Delay Risk Breakdown</span>
            <span className="font-mono text-amber-400 font-semibold">{data.risk_score}/100</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-[#888] font-medium block">Key Contributing Factors:</span>
            <ul className="space-y-1 pl-4 list-disc text-gray-300">
              {data.risk_factors?.map((factor, idx) => (
                <li key={idx} className="leading-snug">
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {data.estimated_delay_days > 0 && (
            <div className="pt-2 border-t border-[#27272a] text-rose-400 font-medium">
              Estimated Delay: +{data.estimated_delay_days} days
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DelayRiskBadge;
