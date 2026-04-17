import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { InjectModel } from '@nestjs/sequelize';
import { Call } from '../models/call.model';
import { Client } from '../models/client.model';
import { EmpowerStats } from '../models/empower-stats.model';
import { Export } from '../models/export.model';
import { HistoriqueLecture, StatusType } from '../models/historique_lecture.model';
import { RingoverService } from '../ringover/ringover.service';
import { EmailService } from '../email/email.service';
import * as fs from 'fs';
import * as path from 'path';
import { Sequelize } from 'sequelize-typescript';

interface CallRow {
  CallID: string;
  StartTime: string;
  AnsweredTime: string;
  UserID: string;
  UserName: string;
  FromNumber: string;
  ToNumber: string;
  IVRName: string;
  direction: string;
  IsAnswered: string;
  LastState: string;
  TotalDuration: string;
  id: string;
  ChannelID: string;
  type: string;
  HangupTime: string;
  InCallDuration: string;
  QueueDuration: string;
  HoldDuration: string;
  RingingDuration: string;
  AfterCallDuration: string;
  IVRDuration: string;
  contact: string;
  IVRID: string;
  ScenarioName: string;
  File: string;
  Note: string;
  Tags: string;
  HangupBy: string;
  Groups: string;
  Notes: string;
  Locations: string;
  DigitEntered: string;
  Missed: string;
}

@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(
    @InjectModel(Call)
    private readonly callModel: typeof Call,
    @InjectModel(Client)
    private readonly clientModel: typeof Client,
    @InjectModel(EmpowerStats)
    private readonly empowerStatsModel: typeof EmpowerStats,
    @InjectModel(Export)
    private readonly exportModel: typeof Export,
    private readonly ringoverService: RingoverService,
    private readonly email: EmailService,
    private readonly sequelize: Sequelize,
  ) {}

  //start auto importation
  async processCallsAuto(): Promise<any> {

    const folderPath = path.join(process.cwd(), 'csv-template', 'new');
    const files = await fs.readdirSync(folderPath);

    if (files.length === 0) {
      throw new Error('Aucun fichier CSV trouvé : ' + folderPath);
    }

    const fileName = files[0];
    const filePath = path.join(folderPath, fileName);
    const buffer = await fs.readFileSync(filePath);

    await this.email.sendEmailNotification(
        [],
        "Demarrage du traitement du fichier",
        ` Fichier :\n${filePath}\n\n Bonjour,\n Le traitement du fichier a démarré.\n Sauvegarde des donnees en cours.\n\n Bien cordialement`
    );
  
    try{

      let result = await this.readwriteCall(buffer, fileName);

      if(result.total_inserted > 0 ){
        // deplacement du fichier traiter
        const destinationFolder = path.join(process.cwd(), 'csv-template', 'processed');

        const sourcePath = path.join(folderPath, fileName);
        const destinationPath = path.join(destinationFolder, fileName);

        // fs.renameSync(sourcePath, destinationPath);

        fs.copyFileSync(sourcePath, destinationPath);
        fs.unlinkSync(sourcePath);

        console.log(`Fichier ${fileName} déplacé`);
        
      }else{
        // deplacement du fichier traiter
        const destinationFolder = path.join(process.cwd(), 'csv-template', 're-processed');

        const sourcePath = path.join(folderPath, fileName);
        const destinationPath = path.join(destinationFolder, fileName);

        // fs.renameSync(sourcePath, destinationPath);

        fs.copyFileSync(sourcePath, destinationPath);
        fs.unlinkSync(sourcePath);

        console.log(`Fichier ${fileName} déplacé`);
      }

      return result;

    }catch(error){
      // deplacement du fichier comme errone
      const destinationFolder = path.join(process.cwd(), 'csv-template', 'failed');

      const sourcePath = path.join(folderPath, fileName);
      const destinationPath = path.join(destinationFolder, fileName);

      // fs.renameSync(sourcePath, destinationPath);

      fs.copyFileSync(sourcePath, destinationPath);
      fs.unlinkSync(sourcePath);

      await this.email.sendEmailNotification(
        [
          { filePath: destinationPath, fileName: fileName },
        ],
        "Erreur lors du traitement des fichiers",
        `Fichier :\n ${destinationPath}\n ERROR: ${(error as Error).message}`
      );

      console.log(`Fichier ${fileName} déplacé comme failed`);
      throw error;
    }
    
  }

  // ---- lecture de fichier csv --------------------------
  async readwriteCall(buffer: Buffer, file_name: string):Promise<any>{

    let new_client = 0;
    let old_client = 0;
    let total_inserted = 0;
    let total_skipped = 0;
    let total_errors = 0;

    // ÉTAPE 1 — Parser le CSV
    let csv = buffer.toString();

    // // Nettoyage des quotes foireuses
    // csv = csv.replace(/""\[/g, '[').replace(/\]""/g, ']').replace(/"{3,}/g, '"').replace(/"\[/g, '[').replace(/\]"/g, ']');

    // Sauvegarde de la lecture
    const histo = await HistoriqueLecture.create({
      file_name: file_name,
      status: 'failed',
      error_message: undefined,
      file_type: 'csv_stats'
    } as any);

    try{

      const rows = await parse(csv, {
        delimiter: ';',
        //columns: true,
        skip_empty_lines: true,
        trim: true,
        columns: [
          'id',
          'CallID',
          'ChannelID',
          'type',
          'direction',
          'IsAnswered',
          'LastState',
          'StartTime',
          'AnsweredTime',
          'HangupTime',
          'TotalDuration',
          'InCallDuration',
          'QueueDuration',
          'HoldDuration',
          'RingingDuration',
          'AfterCallDuration',
          'IVRDuration',
          'FromNumber',
          'ToNumber',
          'contact',
          'UserID',
          'UserName',
          'IVRID',
          'IVRName',
          'ScenarioName',
          'File',
          'Note',
          'Tags',
          'HangupBy',
          'Groups',
          'Notes',
          'Locations',
          'DigitEntered',
          'Missed'
        ],
        from_line: 2,
        // relax_column_count: true,
        relax_quotes: true,
        quote: '"',
        skip_records_with_empty_values: false,
      }) as CallRow[];

      const validRows = rows.filter(row =>
        row.CallID?.trim() !== '' &&
        row.StartTime?.trim() !== ''
      );

      // Verification si c'est le bon CSV
      const requiredColumns = [
        "CallID",
        "StartTime",
        "AnsweredTime",
        "UserID",
        "UserName",
        "FromNumber",
        "ToNumber",
        "IVRName",
        "direction",
        "IsAnswered",
        "LastState",
        "TotalDuration",
        "id",
        "ChannelID",
        "type",
        "HangupTime",
        "InCallDuration",
        "QueueDuration",
        "HoldDuration",
        "RingingDuration",
        "AfterCallDuration",
        "IVRDuration",
        "contact",
        "IVRID",
        "ScenarioName",
        "File",
        "Note",
        "Tags",
        "Groups",
        "Notes",
        "Locations",
        "DigitEntered",
        "Missed"
      ];

      const csvColumns = Object.keys(validRows[0]);

      for (const col of requiredColumns) {
        if (!csvColumns.includes(col)) {
          throw new BadRequestException(`CSV invalide : colonne manquante ${col}`);
        }
      }

      this.logger.log(`CSV lu : ${validRows.length} lignes`);

      // ÉTAPE 2 — Grouper par IVRName
      const grouped = await this.groupByIVRName(validRows);
      const uniqueIVRNames = Object.keys(grouped);

      this.logger.log(
        `IVRName uniques : ${uniqueIVRNames.join(', ')} (${uniqueIVRNames.length} tenant(s))`,
      );

      // ÉTAPE 3 — Creation de chaque IVR
      for (const ivrName of uniqueIVRNames) {

        const calls = grouped[ivrName];
        const clientName = ivrName;
        this.logger.log(
          `Traitement : "${ivrName}" → "${clientName}" (${calls.length} appels)`,
        );

        //verification si le client exit 
        let check = await this.clientModel.findOne({
          where: { client_name: clientName || 'unknown' },
        });
        
        if(!check){
          await this.clientModel.create({
              ivr_id: calls[0].IVRID || '',
              client_name: clientName || 'unknown',
          } as any);
          this.logger.log(`Client créé : ${clientName}`);
          new_client ++;
        }else{
          old_client ++;
        }

        // ÉTAPE 3c — Insérer les appels dans la DB du tenant
        const { inserted, skipped, errors } = await this.insertCalls( calls, clientName, histo.id );

        //mettre a jour l'historique en success
        await HistoriqueLecture.update(
          { status: StatusType.success },    
          { where: { id: histo.id } }  
        );

        total_inserted += inserted;
        total_skipped += skipped;
        total_errors += errors.length;

      }

      this.logger.log(
        `RÉSUMÉ : new client: ${new_client} | old client: ${old_client} | call skipped: ${total_skipped} | call error: ${total_errors} | call inserted: ${total_inserted}`,
      );

      return {
        new_client,
        old_client,
        total_inserted,
        total_skipped,
        total_errors
      };

    }catch(err){
      //mettre a jour l'historique en success
      await HistoriqueLecture.update(
        { status: StatusType.failed, error_message: (err as Error).message },    
        { where: { id: histo.id } }  
      );

      throw err;
    }

  }

  // ─── Insert calls into DB ─────────────────────────────
  async insertCalls(calls: CallRow[], tenantName: string, historique_lecture_id: number,): Promise<{ inserted: number; skipped: number; errors: { call_id: string; error: string }[];}> {
    let inserted = 0;
    let skipped = 0;

    const errors: { call_id: string; error: string }[] = [];

    this.logger.log(`Inserting ${calls.length} calls → ${tenantName}`);

    // initialisation de la transaction
    const transaction = await this.sequelize.transaction();

    for (const row of calls) {
      try {
        // --- Upsert Call ---
        let [callRecord, created] = await this.callModel.upsert({
          call_id: row.CallID,
          date_start: this.parseDate(row.StartTime),
          date_answer: this.parseDate(row.AnsweredTime),
          user_id: row.UserID || null,
          user_name: row.UserName || null,
          direction: row.direction || null,
          duration: row.TotalDuration ? parseInt(row.TotalDuration) : null,
          from_number: row.FromNumber || null,
          to_number: row.ToNumber || null,
          is_answered: row.IsAnswered?.toUpperCase() === 'TRUE',
          last_state: row.LastState || null,
          raw_data: row as any,
          historique_lecture_id: historique_lecture_id,
          id: row.id || null,
          ChannelID: row.ChannelID || null,
          type: row.type || null,
          HangupTime: this.parseDate(row.HangupTime),
          InCallDuration: parseFloat(row.InCallDuration) || null,
          QueueDuration: parseFloat(row.QueueDuration) || null,
          HoldDuration: parseFloat(row.HoldDuration) || null,
          RingingDuration: parseFloat(row.RingingDuration) || null,
          AfterCallDuration: parseFloat(row.AfterCallDuration) || null,
          IVRDuration: parseFloat(row.IVRDuration) || null,
          contact: row.contact || null,
          IVRID: row.IVRID || null,
          ScenarioName: row.ScenarioName || null,
          File: row.File || null,
          Note: row.Note || null,
          Tags: row.Tags || null,
          HangupBy: row.HangupBy || null,
          Groups: row.Groups || null,
          Notes: row.Notes || null,
          Locations: row.Locations || null,
          DigitEntered: row.DigitEntered || null,
          Missed: this.cleanDate(row.Missed),
        } as any, { transaction });

        if (created) {
          this.logger.log(`Call ${row.CallID} was inserted`);
          inserted ++;

          // --- Upsert EmpowerStats ---
          try {
            const callIdClean = row.CallID.replace('CALLID', '');
            const exist = await this.empowerStatsModel.findOne({
              where: { call_id: callIdClean },
            });

            if (!exist) {
              const ringoverObject =
                await this.ringoverService.getEmpowerByChannelID(row.ChannelID.replace('CHANNELID', ''));

              await this.empowerStatsModel.upsert({
                call_id: callIdClean,
                call_uuid: ringoverObject.call_uuid,
                score_global: ringoverObject.call_score,
                customer_sentiment: ringoverObject.customer_sentiment,
                moments: ringoverObject.moments,
                transcription: ringoverObject.transcription.speeches
                  .map((s) => `Speaker ${s.channelId}: ${s.text}`)
                  .join('\n'),
                raw_data: ringoverObject,
              } as any, { transaction });

              this.logger.log(
                `Ringover info inserted for call_id ${row.CallID} / ${row.ChannelID}`,
              );
            } else {
              this.logger.log(
                `Ringover info already exists for call_id ${row.CallID} / ${row.ChannelID}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Ringover API error for call_id ${row.CallID} - ${error.message}`,
            );
          }

        } else {
          this.logger.log(`Call ${row.CallID} was updated`);
          skipped++;
        }

      } catch (err) {
        errors.push({ call_id: row.CallID, error: (err as Error).message });
        // Rollback des isertions de call
        await transaction.rollback();
        throw err;
      }
    }

    // sauvegarde des call
    await transaction.commit();

    this.logger.log(
      `${tenantName} : ${inserted} inserted, ${skipped} skipped`,
    );
    if (errors.length > 0) this.logger.error(errors);

    return { inserted, skipped, errors };
  }

  // ─── Parse a date string ─────────────────────────────
  private parseDate(dateStr: string): string | null {
    if (!dateStr?.trim()) return null;

    const [datePart, timePart] = dateStr.trim().split(' ');
    if (!datePart || !timePart) return null;

    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    if ([year, month, day, hours, minutes, seconds].some(isNaN)) return null;

    // Use Date to handle midnight overflow automatically
    const d = new Date(year, month - 1, day, hours + 2, minutes, seconds);
    if (isNaN(d.getTime())) return null;

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // ─── Clean string value ─────────────────────────────
  private cleanValue(value?: string): string | null {
    if (!value) return null;
    const cleaned = value.replace(/[;,]+/g, '').trim();
    return cleaned || null;
  }

  // ─── Clean date string ──────────────────────────────
  private cleanDate(value?: string): string | null {
    const cleaned = this.cleanValue(value);
    if (!cleaned) return null;
    // const date = new Date(cleaned.replace(' ', 'T'));
    // return isNaN(date.getTime()) ? null : date;
    return cleaned;
  }

  // ─── Grouper les lignes CSV par IVRName ──────────────────────────────────
  private groupByIVRName(rows: CallRow[]): Record<string, CallRow[]> {
    return rows.reduce((acc, row) => {
      const key = row.IVRName?.trim() || 'unknown';

      if (!acc[key]) acc[key] = [];
      acc[key].push(row);

      return acc;
    }, {} as Record<string, CallRow[]>);
  }
}