import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
@Index(['actorId', 'createdAt'])
@Index(['targetType', 'targetId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // userId, 'stripe', or 'system'
  @Column({ type: 'varchar', length: 100 })
  actorId: string;

  @Column({ type: 'varchar', length: 30 })
  actorRole: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 50 })
  targetType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  beforeState: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  afterState: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
