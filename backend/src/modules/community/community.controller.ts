import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/current-user.decorator';
import { CommunityService } from './community.service';

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private svc: CommunityService) {}

  @Get('posts')
  list(@CurrentUser() u: any, @Query('audience') audience?: string) {
    return this.svc.listPosts(u, audience);
  }

  @Post('posts')
  create(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.createPost(u, body);
  }

  @Delete('posts/:id')
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deletePost(u, id);
  }

  @Post('posts/:id/pin')
  pin(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.togglePin(u, id);
  }

  @Get('posts/:id/comments')
  comments(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.listComments(u, id);
  }

  @Post('posts/:id/comments')
  comment(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { body: string }) {
    return this.svc.addComment(u, id, body.body);
  }

  @Post('posts/:id/react')
  react(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { emoji: string }) {
    return this.svc.toggleReaction(u, id, body.emoji);
  }
}
