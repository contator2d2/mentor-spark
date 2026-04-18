import CommunityFeed from "@/components/community/CommunityFeed";
import { Users } from "lucide-react";

export default function MentoradoCommunity() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" /> Comunidade
      </h1>
      <CommunityFeed asMentorado />
    </div>
  );
}
