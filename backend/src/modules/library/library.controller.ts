import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.decorators';
import { TenantId } from '../auth/current-user.decorator';
import { LibraryService } from './library.service';
import { LibrarySegment, LibraryTestKind } from '../../entities/library-test-template.entity';

@ApiTags('library')
@ApiBearerAuth()
@Controller('library')
export class LibraryController {
  constructor(private library: LibraryService) {}

  @Auth('mentor', 'super_admin')
  @Get('segments')
  segments() {
    return this.library.getSegments();
  }

  @Auth('mentor', 'super_admin')
  @Get('tests')
  list(
    @Query('segment') segment?: LibrarySegment,
    @Query('kind') kind?: LibraryTestKind,
    @Query('q') q?: string,
  ) {
    return this.library.list({ segment, kind, q });
  }

  @Auth('mentor', 'super_admin')
  @Get('tests/:id')
  get(@Param('id') id: string) {
    return this.library.getOne(id);
  }

  @Auth('mentor', 'super_admin')
  @Post('tests/:id/clone')
  clone(@Param('id') id: string, @TenantId() mentorId: string) {
    return this.library.cloneToMentor(id, mentorId);
  }
}
