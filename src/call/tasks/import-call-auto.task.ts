import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { CallService } from '../call.service';
import { ExportService } from '../../export/export.service';

async function bootstrap() {

  const app = await NestFactory.createApplicationContext(AppModule);

  const callService = await app.get(CallService);

  await callService.processCallsAuto();

  const exportService = await app.get(ExportService);

  await exportService.exportAutoAllInOne();

  await app.close();
}

bootstrap();