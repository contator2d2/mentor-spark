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

  /** payload JWT usa `sub`. Normaliza para id do user. */
  private uid(user: any): string {
    return user.sub || user.id;
  }

  /** Resolve mentorId a partir do user logado (mentor cria; mentorado vê do seu mentor). */
  private async resolveMentorId(user: any): Promise<string> {
    if (user.role === 'mentor' || user.role === 'super_admin') return this.uid(user);
    if (user.role === 'mentor_team' && user.parentMentorId) return user.parentMentorId;
    if (user.mentorId) return user.mentorId;
    const lead = await this.leads.findOne({ where: { userId: this.uid(user) } as any });
    if (lead) return lead.mentorId;
    throw new ForbiddenException('Sem mentor vinculado');
  }

  async listPosts(user: any, audienceFilter?: string) {
    const mentorId = await this.resolveMentorId(user);
    const userId = this.uid(user);
    const qb = this.posts.createQueryBuilder('p').where('p.mentorId = :m', { m: mentorId });
    if (user.role !== 'mentor' && user.role !== 'super_admin' && user.role !== 'mentor_team') {
      qb.andWhere("p.audience IN ('all', 'clients')");
    }
    if (audienceFilter) qb.andWhere('p.audience = :a', { a: audienceFilter });
    qb.orderBy('p.pinned', 'DESC').addOrderBy('p.createdAt', 'DESC').take(50);
    const list = await qb.getMany();

    const ids = list.map((p) => p.id);
    if (!ids.length) return [];
    const myRx = await this.reactions
      .createQueryBuilder('r')
      .where('r.userId = :uid AND r.postId IN (:...ids)', { uid: userId, ids })
      .getMany();
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
    const userId = this.uid(user);
    const u = await this.users.findOne({ where: { id: userId } });
    const isMentorRole = user.role === 'mentor' || user.role === 'super_admin' || user.role === 'mentor_team';
    const post = this.posts.create({
      mentorId,
      authorId: userId,
      authorRole: user.role,
      authorName: u?.name,
      authorAvatarUrl: u?.brandLogoUrl,
      body: dto.body || '',
      title: dto.title,
      media: dto.media || [],
      audience: dto.audience || 'all',
      pinned: isMentorRole ? !!dto.pinned : false,
      locked: isMentorRole ? !!dto.locked : false,
    });
    return this.posts.save(post);
  }

  async deletePost(user: any, id: string) {
    const p = await this.posts.findOne({ where: { id } });
    if (!p) throw new NotFoundException();
    const mentorId = await this.resolveMentorId(user);
    const userId = this.uid(user);
    if (p.mentorId !== mentorId) throw new ForbiddenException();
    const isMentorRole = user.role === 'mentor' || user.role === 'super_admin' || user.role === 'mentor_team';
    if (p.authorId !== userId && !isMentorRole) throw new ForbiddenException();
    await this.comments.delete({ postId: id });
    await this.reactions.delete({ postId: id });
    await this.posts.delete(id);
    return { ok: true };
  }

  async togglePin(user: any, id: string) {
    if (user.role !== 'mentor' && user.role !== 'super_admin') throw new ForbiddenException();
    const p = await this.posts.findOne({ where: { id, mentorId: this.uid(user) } });
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
    const isMentorRole = user.role === 'mentor' || user.role === 'super_admin' || user.role === 'mentor_team';
    if (p.locked && !isMentorRole) throw new ForbiddenException('Post bloqueado para comentários');
    const mentorId = await this.resolveMentorId(user);
    if (p.mentorId !== mentorId) throw new ForbiddenException();
    const userId = this.uid(user);
    const u = await this.users.findOne({ where: { id: userId } });
    const c = await this.comments.save(this.comments.create({
      postId,
      mentorId: p.mentorId,
      authorId: userId,
      authorRole: user.role,
      authorName: u?.name,
      authorAvatarUrl: u?.brandLogoUrl,
      body,
    }));
    p.commentCount = (p.commentCount || 0) + 1;
    await this.posts.save(p);
    if (p.authorId !== userId) {
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
    const userId = this.uid(user);
    const existing = await this.reactions.findOne({ where: { postId, userId, emoji } });
    if (existing) {
      await this.reactions.delete(existing.id);
      p.reactionCount = Math.max(0, (p.reactionCount || 0) - 1);
    } else {
      await this.reactions.save(this.reactions.create({ postId, userId, emoji }));
      p.reactionCount = (p.reactionCount || 0) + 1;
    }
    await this.posts.save(p);
    return { ok: true };
  }
}
