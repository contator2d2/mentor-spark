import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/** Evento de captação (workshop, palestra, feira) — base para origem de leads. */
@Entity('events')
@Index(['mentorId'])
export class CaptureEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  mentorId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  /** Slug curto único usado no QR/link público (/c/:mentorSlug?event=xyz) */
  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
