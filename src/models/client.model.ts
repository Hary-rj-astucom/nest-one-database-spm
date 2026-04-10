import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
} from 'sequelize-typescript';

@Table({ tableName: 'clients', timestamps: false })
export class Client extends Model<Client> {
  @PrimaryKey
  @AutoIncrement
  @Column
  declare id: number;

  @Column(DataType.STRING(45))
  ivr_id: string;

  @Column(DataType.STRING(45))
  client_name: string;
}