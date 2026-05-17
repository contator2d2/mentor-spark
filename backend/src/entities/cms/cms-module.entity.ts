 import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

 @Entity('cms_modules')
 @Index(['mentorId'])
 export class CmsModule {
   @PrimaryGeneratedColumn('uuid')
   id: string;

   @Column({ type: 'uuid' })
   mentorId: string;

   @Column()
   name: string;

   @Column()
   slug: string;

   @Column({ type: 'text', nullable: true })
   description?: string;

   @Column({ nullable: true })
   icon?: string;

   @Column({ default: true })
   isActive: boolean;

   @Column({ default: 0 })
   order: number;

   @Column({ default: true })
   showInSite: boolean;

   @Column({ default: false })
   showInHome: boolean;

   @Column({ type: 'jsonb', nullable: true })
   permissions?: string[];

   @Column({ type: 'jsonb', nullable: true })
   customFields?: any;

   @CreateDateColumn()
   createdAt: Date;

   @UpdateDateColumn()
   updatedAt: Date;
 }

 @Entity('cms_banners')
 export class CmsBanner {
   @PrimaryGeneratedColumn('uuid')
   id: string;

   @Column({ type: 'uuid' })
   mentorId: string;

   @Column()
   desktopImageUrl: string;

   @Column({ nullable: true })
   mobileImageUrl?: string;

   @Column({ nullable: true })
   title?: string;

   @Column({ type: 'text', nullable: true })
   subtitle?: string;

   @Column({ nullable: true })
   buttonText?: string;

   @Column({ nullable: true })
   buttonLink?: string;

   @Column({ type: 'timestamptz', nullable: true })
   startDate?: Date;

   @Column({ type: 'timestamptz', nullable: true })
   endDate?: Date;

   @Column({ default: true })
   isActive: boolean;

   @Column({ default: 0 })
   displayOrder: number;

   @CreateDateColumn()
   createdAt: Date;
 }
