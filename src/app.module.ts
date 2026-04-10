import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { AppService } from './app.service';

import { SequelizeModule } from '@nestjs/sequelize';

import { ConfigModule } from '@nestjs/config';

import { Client } from './models/client.model';
import { Call } from './models/call.model';
import { EmpowerStats } from './models/empower-stats.model';
import { Export } from './models/export.model';
import { HistoriqueLecture } from './models/historique_lecture.model';
import { CallService } from './call/call.service';
import { RingoverService } from './ringover/ringover.service';
import { ExportService } from './export/export.service';
import { EmailService } from './email/email.service';
import { FtpService } from './ftp/ftp.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // make env variables available globally
    }),
    SequelizeModule.forRoot({
      dialect: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASENAME,
      autoLoadModels: true,
      synchronize: true, 
      logging: false,
    }),
    SequelizeModule.forFeature([Client, Call, EmpowerStats, Export, HistoriqueLecture]),
  ],
  controllers: [AppController],
  providers: [AppService, CallService, RingoverService, ExportService, EmailService, FtpService],
})
export class AppModule {}
