import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanFeatures {
  allowAi: boolean;
  allowWhatsapp: boolean;
  allowMeetings: boolean;
  allowCommunity: boolean;
  allowTrails: boolean;
  allowScheduling: boolean;
  allowMentorBilling: boolean;
  allowAutomations: boolean;
  allowLandingBuilder: boolean;
  allowAdvancedAnalytics: boolean;
  allowMessaging: boolean;
  allowGoogleCalendar: boolean;
  allowCustomDomain: boolean;
}

interface PlanFeaturesResponse {
  plan: { id: string; slug: string; name: string } | null;
  isExpired: boolean;
  features: PlanFeatures;
}

const ALL_TRUE: PlanFeatures = {
  allowAi: true, allowWhatsapp: true, allowMeetings: true, allowCommunity: true,
  allowTrails: true, allowScheduling: true, allowMentorBilling: true,
  allowAutomations: true, allowLandingBuilder: true, allowAdvancedAnalytics: true,
  allowMessaging: true, allowGoogleCalendar: true, allowCustomDomain: true,
};

let cache: PlanFeaturesResponse | null = null;
const subscribers = new Set<(d: PlanFeaturesResponse) => void>();

export function invalidatePlanFeatures() {
  cache = null;
}

export function usePlanFeatures() {
  const { user } = useAuth();
  const [data, setData] = useState<PlanFeaturesResponse | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (!user) { setData(null); setLoading(false); return; }
    if (cache) { setData(cache); setLoading(false); return; }

    let alive = true;
    const update = (d: PlanFeaturesResponse) => { if (alive) setData(d); };
    subscribers.add(update);

    api<PlanFeaturesResponse>("/plans/me/features")
      .then((r) => {
        cache = r;
        subscribers.forEach((fn) => fn(r));
      })
      .catch(() => {
        // Em caso de erro, libera tudo (não bloqueia UX)
        const fallback: PlanFeaturesResponse = { plan: null, isExpired: false, features: ALL_TRUE };
        cache = fallback;
        subscribers.forEach((fn) => fn(fallback));
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; subscribers.delete(update); };
  }, [user]);

  return {
    features: data?.features ?? ALL_TRUE,
    plan: data?.plan ?? null,
    isExpired: data?.isExpired ?? false,
    loading,
  };
}
