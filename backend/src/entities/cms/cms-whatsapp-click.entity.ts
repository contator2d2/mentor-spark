 import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

 @Entity('cms_whatsapp_clicks')
 export class CmsWhatsappClick {
   @PrimaryGeneratedColumn('uuid')
   id: string;

   @Column({ type: 'uuid' })
   mentorId: string;

   @Column()
   type: string; // kit, course, shop, general

   @Column({ nullable: true })
   relatedItemId?: string;

   @Column({ nullable: true })
   relatedItemName?: string;

   @Column({ nullable: true })
   originPage?: string;

   @CreateDateColumn()
   createdAt: Date;
 }
