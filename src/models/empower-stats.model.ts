import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
} from 'sequelize-typescript';

@Table({ tableName: 'empower_stats', timestamps: false })
export class EmpowerStats extends Model<EmpowerStats> {
  @PrimaryKey
  @AutoIncrement
  @Column
  empower_id: number;

  @Column(DataType.STRING(255))
  call_uuid: string;

  @Column({
    type: DataType.STRING(255),
    unique: true,
  })
  call_id: string;

  @Column(DataType.FLOAT)
  score_global: number;

  @Column(DataType.STRING(255))
  customer_sentiment: string;

  @Column(DataType.JSON)
  moments: object;

  @Column(DataType.TEXT)
  transcription: string;

  @Column(DataType.JSON)
  raw_data: object;

  @Column(DataType.DATE)
  created_at: Date;
}