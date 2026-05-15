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

    const fetchFeatures = async () => {
      try {
        const r = await api<PlanFeaturesResponse>("/plans/me/features");
        if (alive) {
          cache = r;
          subscribers.forEach((fn) => fn(r));
        }
      } catch (err: any) {
        console.error("Error fetching plan features:", err);
        // Em caso de erro (ex: 403 por ser admin de equipe sem acesso ao plano do mentor principal)
        // ou erro de rede, libera tudo para não bloquear a interface (UX em primeiro lugar).
        const fallback: PlanFeaturesResponse = { plan: null, isExpired: false, features: ALL_TRUE };
        if (alive) {
          cache = fallback;
          subscribers.forEach((fn) => fn(fallback));
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchFeatures();

    return () => { alive = false; subscribers.delete(update); };
  }, [user]);

  return {
    features: data?.features ?? ALL_TRUE,
    plan: data?.plan ?? null,
    isExpired: data?.isExpired ?? false,
    loading,
  };
}
