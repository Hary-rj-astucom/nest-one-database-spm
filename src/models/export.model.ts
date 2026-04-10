import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
} from 'sequelize-typescript';

export enum StatusType {
  success = 'success',
  failed = 'failed',
}

export enum ExportTypeEnum {
  csv_stats = 'csv_stats',
  csv_empower = 'csv_empower',
}

@Table({ tableName: 'exports', timestamps: false })
export class Export extends Model<Export> {
  @PrimaryKey
  @AutoIncrement
  @Column
  declare id: number;

  @Column(DataType.ENUM(...Object.values(ExportTypeEnum)))
  export_type: ExportTypeEnum;

  @Column(DataType.TEXT)
  file_path: string;

  @Default(StatusType.failed)
  @Column(DataType.ENUM(...Object.values(StatusType)))
  status: StatusType;

  @Column({type: DataType.TEXT, allowNull: true })
  error_message?: string | null;

  @Column(DataType.DATE)
  created_at: Date;

  @Column(DataType.DATE)
  updated_at: Date;

  @Column(DataType.INTEGER)
  historique_lecture_id: number;
}