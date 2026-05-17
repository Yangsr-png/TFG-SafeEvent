import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('panic_alerts') // Nombre real de la tabla en PostgreSQL
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column({ nullable: true })
  eventId!: string;

  @Column('float')
  latitude!: number;

  @Column('float')
  longitude!: number;

  @Column({ default: 'RECEIVED' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}