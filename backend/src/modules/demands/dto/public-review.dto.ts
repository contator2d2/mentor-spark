import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DemandStatus } from '../../../entities/demand.entity';

export class PublicReviewDto {
  @IsEnum([DemandStatus.APPROVED, DemandStatus.ADJUSTMENTS])
  status: DemandStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
