import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
} from 'sequelize-typescript';

export enum StatusType {
  success = 'success',
  failed = 'failed',
}

export enum ExportTypeEnum {
  csv_stats = 'csv_stats',
  csv_empower = 'csv_empower',
}

@Table({ tableName: 'historique_lecture', timestamps: false })
export class HistoriqueLecture extends Model<HistoriqueLecture> {
  @PrimaryKey
  @AutoIncrement
  @Column
  declare id: number;

  @Column(DataType.TEXT)
  file_name: string;

  @Default(StatusType.failed)
  @Column(DataType.ENUM(...Object.values(StatusType)))
  status: StatusType;

  @Column({type: DataType.TEXT, allowNull: true})
  error_message: string | null;

  @Column(DataType.ENUM(...Object.values(ExportTypeEnum)))
  file_type: ExportTypeEnum;

  @Column({type: DataType.DATE, allowNull: true})
  created_at: Date | null;

  @Column(DataType.DATE)
  updated_at: Date;
}