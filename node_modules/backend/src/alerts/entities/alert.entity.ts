import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('panic_alerts') 
// 1. ÍNDICE OBLIGATORIO: Transforma una búsqueda O(N) que mata la BD en una búsqueda O(log N) casi instantánea.
@Index(['userId', 'status'])
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

  // 2. COLUMNA DE TELEMETRÍA OBLIGATORIA: TypeORM la actualizará sola cada vez que el GPS envíe un nuevo latido (UPSERT).
  @UpdateDateColumn()
  updatedAt!: Date;
}