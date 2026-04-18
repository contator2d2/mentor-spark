import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityPost } from '../../entities/community-post.entity';
import { CommunityComment } from '../../entities/community-comment.entity';
import { CommunityReaction } from '../../entities/community-reaction.entity';
import { User } from '../../entities/user.entity';
import { Lead } from '../../entities/lead.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost) private posts: Repository<CommunityPost>,
    @InjectRepository(CommunityComment) private comments: Repository<CommunityComment>,
    @InjectRepository(CommunityReaction) private reactions: Repository<CommunityReaction>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    private notifications: NotificationsService,
  ) {}

  /** Resolve mentorId a partir do user logado (mentor cria; mentorado vê do seu mentor). */
  private async resolveMentorId(user: any): Promise<string> {
    if (user.role === 'mentor' || user.role === 'super_admin') return user.id;
    if (user.mentorId) return user.mentorId;
    // mentorado/prospect: busca via lead
    const lead = await this.leads.findOne({ where: { userId: user.id } as any });
    if (lead) return lead.mentorId;
    throw new ForbiddenException('Sem mentor vinculado');
  }

  async listPosts(user: any, audienceFilter?: string) {
    const mentorId = await this.resolveMentorId(user);
    const qb = this.posts.createQueryBuilder('p').where('p.mentorId = :m', { m: mentorId });
    // mentorados só veem audiência 'all' ou 'clients' (e cohorts próprias futuras)
    if (user.role !== 'mentor' && user.role !== 'super_admin') {
      qb.andWhere("p.audience IN ('all', 'clients')");
    }
    if (audienceFilter) qb.andWhere('p.audience = :a', { a: audienceFilter });
    qb.orderBy('p.pinned', 'DESC').addOrderBy('p.createdAt', 'DESC').take(50);
    const list = await qb.getMany();

    // Anexa minhas reações
    const ids = list.map((p) => p.id);
    if (!ids.length) return [];
    const myRx = await this.reactions.find({ where: ids.map((id) => ({ postId: id, userId: user.id })) });
    const rxByPost = await this.reactions.createQueryBuilder('r')
      .select('r.postId', 'postId')
      .addSelect('r.emoji', 'emoji')
      .addSelect('COUNT(*)', 'count')
      .where('r.postId IN (:...ids)', { ids })
      .groupBy('r.postId, r.emoji')
      .getRawMany();
    return list.map((p) => ({
      ...p,
      myReactions: myRx.filter((r) => r.postId === p.id).map((r) => r.emoji),
      reactions: rxByPost.filter((r) => r.postId === p.id).map((r) => ({ emoji: r.emoji, count: +r.count })),
    }));
  }

  async createPost(user: any, dto: Partial<CommunityPost>) {
    const mentorId = await this.resolveMentorId(user);
    const u = await this.users.findOne({ where: { id: user.id } });
    const post = this.posts.create({
      mentorId,
      authorId: user.id,
      authorRole: user.role,
      authorName: u?.name,
      authorAvatarUrl: u?.brandLogoUrl,
      body: dto.body || '',
      title: dto.title,
      media: dto.media || [],
      audience: dto.audience || 'all',
      pinned: (user.role === 'mentor' || user.role === 'super_admin') ? !!dto.pinned : false,
      locked: (user.role === 'mentor' || user.role === 'super_admin') ? !!dto.locked : false,
    });
    return this.posts.save(post);
  }

  async deletePost(user: any, id: string) {
    const p = await this.posts.findOne({ where: { id } });
    if (!p) throw new NotFoundException();
    const mentorId = await this.resolveMentorId(user);
    if (p.mentorId !== mentorId) throw new ForbiddenException();
    if (p.authorId !== user.id && user.role !== 'mentor' && user.role !== 'super_admin') throw new ForbiddenException();
    await this.comments.delete({ postId: id });
    await this.reactions.delete({ postId: id });
    await this.posts.delete(id);
    return { ok: true };
  }

  async togglePin(user: any, id: string) {
    if (user.role !== 'mentor' && user.role !== 'super_admin') throw new ForbiddenException();
    const p = await this.posts.findOne({ where: { id, mentorId: user.id } });
    if (!p) throw new NotFoundException();
    p.pinned = !p.pinned;
    return this.posts.save(p);
  }

  async listComments(user: any, postId: string) {
    const p = await this.posts.findOne({ where: { id: postId } });
    if (!p) throw new NotFoundException();
    const mentorId = await this.resolveMentorId(user);
    if (p.mentorId !== mentorId) throw new ForbiddenException();
    return this.comments.find({ where: { postId }, order: { createdAt: 'ASC' } });
  }

  async addComment(user: any, postId: string, body: string) {
    const p = await this.posts.findOne({ where: { id: postId } });
    if (!p) throw new NotFoundException();
    if (p.locked && user.role !== 'mentor' && user.role !== 'super_admin') throw new ForbiddenException('Post bloqueado para comentários');
    const mentorId = await this.resolveMentorId(user);
    if (p.mentorId !== mentorId) throw new ForbiddenException();
    const u = await this.users.findOne({ where: { id: user.id } });
    const c = await this.comments.save(this.comments.create({
      postId,
      mentorId: p.mentorId,
      authorId: user.id,
      authorRole: user.role,
      authorName: u?.name,
      authorAvatarUrl: u?.brandLogoUrl,
      body,
    }));
    p.commentCount = (p.commentCount || 0) + 1;
    await this.posts.save(p);
    // Notifica autor do post se não for ele mesmo
    if (p.authorId !== user.id) {
      await this.notifications.create({
        userId: p.authorId,
        type: 'community_comment',
        title: `${u?.name || 'Alguém'} comentou no seu post`,
        body: body.slice(0, 100),
      }).catch(() => null);
    }
    return c;
  }

  async toggleReaction(user: any, postId: string, emoji: string) {
    const p = await this.posts.findOne({ where: { id: postId } });
    if (!p) throw new NotFoundException();
    const mentorId = await this.resolveMentorId(user);
    if (p.mentorId !== mentorId) throw new ForbiddenException();
    const existing = await this.reactions.findOne({ where: { postId, userId: user.id, emoji } });
    if (existing) {
      await this.reactions.delete(existing.id);
      p.reactionCount = Math.max(0, (p.reactionCount || 0) - 1);
    } else {
      await this.reactions.save(this.reactions.create({ postId, userId: user.id, emoji }));
      p.reactionCount = (p.reactionCount || 0) + 1;
    }
    await this.posts.save(p);
    return { ok: true };
  }
}
