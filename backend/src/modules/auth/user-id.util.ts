/**
 * Helpers para extrair IDs do JWT payload de forma robusta.
 * O payload do JWT usa `sub` (padrão JWT), mas alguns controllers
 * legados acessavam `u.id` — que NÃO existe e causava 500 no SQL.
 */

export function userId(u: any): string {
  if (!u) return '';
  return u.sub || u.id || '';
}

/**
 * Resolve o id do mentor (tenant) a partir do payload:
 * - mentor / super_admin → seu próprio id
 * - mentor_team → parentMentorId
 * - mentorado / prospect → mentorId
 */
export function mentorIdOf(u: any): string {
  if (!u) return '';
  if (u.role === 'mentor' || u.role === 'super_admin') return u.sub || u.id || '';
  if (u.role === 'mentor_team') return u.parentMentorId || u.mentorId || '';
  return u.mentorId || u.sub || u.id || '';
}
