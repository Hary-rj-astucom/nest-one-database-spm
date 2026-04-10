import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
} from 'sequelize-typescript';

@Table({ tableName: 'call', timestamps: false  })
export class Call extends Model<Call> {
  @PrimaryKey
  @Column({ type: DataType.STRING, allowNull: true })
  declare id?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: false })
  call_id: string;

  @Column({ type: DataType.STRING(45), allowNull: true })
  date_start?: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  date_answer?: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  user_id?: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  user_name?: string | null;

  @Column({ type: DataType.STRING(20), allowNull: true })
  direction?: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  duration?: number | null;

  @Column({ type: DataType.STRING(25), allowNull: true })
  from_number?: string | null;

  @Column({ type: DataType.STRING(25), allowNull: true })
  to_number?: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: true })
  is_answered?: boolean | null;

  @Column({ type: DataType.STRING(25), allowNull: true })
  last_state?: string | null;

  @Column({ type: DataType.JSON, allowNull: true })
  tags?: object | null;

  @Column({ type: DataType.JSON, allowNull: true })
  raw_data?: object | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  historique_lecture_id?: number | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  ChannelID?: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  type?: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  HangupTime?: string | null;

  @Column({ type: DataType.DECIMAL(20, 2), allowNull: true })
  InCallDuration?: number | null;

  @Column({ type: DataType.DECIMAL(20, 6), allowNull: true })
  QueueDuration?: number | null;

  @Column({ type: DataType.DECIMAL(20, 6), allowNull: true })
  HoldDuration?: number | null;

  @Column({ type: DataType.DECIMAL(20, 6), allowNull: true })
  RingingDuration?: number | null;

  @Column({ type: DataType.DECIMAL(20, 6), allowNull: true })
  AfterCallDuration?: number | null;

  @Column({ type: DataType.DECIMAL(20, 6), allowNull: true })
  IVRDuration?: number | null;

  @Column({ type: DataType.STRING(25), allowNull: true })
  contact?: string | null;

  @Column({type: DataType.STRING(25), allowNull: true })
  IVRID?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  ScenarioName?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  File?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  Note?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  Tags?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  HangupBy?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  Groups?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  Notes?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  Locations?: string | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  DigitEntered?: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  Missed?: string | null;
}