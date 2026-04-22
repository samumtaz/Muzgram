import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Idempotency log — prevents duplicate push notifications
@Entity('notification_logs')
@Index(['userId', 'idempotencyKey'], { unique: true })
export class NotificationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 255 })
  idempotencyKey: string;

  @Column({ nullable: true })
  expoTicketId: string | null;

  @Column({ nullable: true })
  deliveryStatus: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
