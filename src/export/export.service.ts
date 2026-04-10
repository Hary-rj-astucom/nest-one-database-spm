import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { InjectModel } from '@nestjs/sequelize';
import { Call } from '../models/call.model';
import { Client } from '../models/client.model';
import { EmpowerStats} from '../models/empower-stats.model';
import { Export, StatusType, ExportTypeEnum } from '../models/export.model';
import { HistoriqueLecture } from '../models/historique_lecture.model';
import { EmailService } from '../email/email.service';
import { FtpService } from '../ftp/ftp.service';
import * as fs from 'fs';
import * as path from 'path';
import dayjs from 'dayjs';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';

@Injectable()
export class ExportService {
    private readonly logger = new Logger(ExportService.name);

    constructor(
        @InjectModel(Call)
        private readonly callModel: typeof Call,
        @InjectModel(Client)
        private readonly clientModel: typeof Client,
        @InjectModel(EmpowerStats)
        private readonly empowerStatsModel: typeof EmpowerStats,
        @InjectModel(Export)
        private readonly exportModel: typeof Export,
        private readonly sequelize: Sequelize,
        private readonly email: EmailService,
        private readonly ftp: FtpService,
    ) {}

    //---------------------------------------------------------------
    async exportAutoAllInOne():Promise<void>{
        this.logger.log('Export ALL IN ONE start');

        const formatDate = (d) => {
            return d && dayjs(d).isValid()
                ? dayjs(d).format('DD/MM/YYYY HH:mm:ss')
                : '';
        };

        const know = Math.floor(Date.now() / 1000);

        const date = new Date();
        date.setDate(date.getDate() - 1);

        const jj = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');

        // get historique none exported
        const results = await this.sequelize.query<{ historique_lecture_id: number }>(
            `SELECT DISTINCT(historique_lecture_id) as historique_lecture_id
            FROM \`call\`
            WHERE historique_lecture_id NOT IN (SELECT DISTINCT(historique_lecture_id) FROM exports)`,
            { type: QueryTypes.SELECT },
        );

        for (const row of results) {

            const histoId = row.historique_lecture_id;
            console.log(`Processing historique_lecture_id: ${histoId}`);

            await this.email.sendEmailNotification(
                [],
                `Demarrage de l'export historique : ${histoId}`,
                `Extration et traitement des donnees de l'historique de lecture ${histoId}`
            );

            try{

                // --- avoir tous les stats des call ---

                // const allCalls = await this.callModel.findAll({
                //     where: { historique_lecture_id: histoId }
                // });

                const allCalls = await this.sequelize.query<any>(
                `SELECT
                    \`call\`.*, 
                    CASE 
                        WHEN clients.client_name IS NULL OR clients.client_name = '' THEN 'unknown' 
                        ELSE clients.client_name
                    END AS client_name
                FROM \`call\` 
                LEFT JOIN clients ON clients.ivr_id = \`call\`.IVRID
                WHERE historique_lecture_id = :histoId`,
                    { 
                        type: QueryTypes.SELECT,
                        replacements: {
                            histoId: histoId
                        }
                    },
                );

                const allCallInStats = await this.sequelize.query<any>(
                `SELECT
                    CONCAT(
                        DATE_FORMAT(STR_TO_DATE(date_start, '%Y-%m-%d %H:%i:%s'), '%Y-%m-%d %H:'), 
                        LPAD(FLOOR(MINUTE(STR_TO_DATE(date_start, '%Y-%m-%d %H:%i:%s'))/15)*15, 2, '0'),
                        ':00'
                    ) AS time_15min,
                    COUNT(*) AS nb_call,
                    SUM(is_answered) AS call_answer,
                    SUM(NOT is_answered) AS call_missed,
                    SUM(duration) AS total_duration,
                    ROUND(AVG(duration), 2) AS avg_duration,
                    CONCAT(
                        ROUND(SUM(is_answered)/COUNT(*)*100, 2),
                        '%'
                    ) AS answer_rate
                FROM \`call\`
                WHERE direction = 'in' AND historique_lecture_id = :histoId
                GROUP BY time_15min`,
                    { 
                        type: QueryTypes.SELECT,
                        replacements: {
                            histoId: histoId
                        }
                    },
                );

                const allCallOutStats = await this.sequelize.query<any>(
                `SELECT
                    CONCAT(
                        DATE_FORMAT(STR_TO_DATE(date_start, '%Y-%m-%d %H:%i:%s'), '%Y-%m-%d %H:'), 
                        LPAD(FLOOR(MINUTE(STR_TO_DATE(date_start, '%Y-%m-%d %H:%i:%s'))/15)*15, 2, '0'),
                        ':00'
                    ) AS time_15min,
                    COUNT(*) AS nb_call,
                    SUM(is_answered) AS call_answer,
                    SUM(NOT is_answered) AS call_missed,
                    SUM(duration) AS total_duration,
                    ROUND(AVG(duration), 2) AS avg_duration,
                    CONCAT(
                        ROUND(SUM(is_answered)/COUNT(*)*100, 2),
                        '%'
                    ) AS answer_rate
                FROM \`call\`
                WHERE direction = 'out' AND historique_lecture_id = :histoId
                GROUP BY time_15min`,
                    { 
                        type: QueryTypes.SELECT,
                        replacements: {
                            histoId: histoId
                        }
                    },
                );

                // --- export tous les stats des call ---

                // preparation de l'export
                const exportDir = path.join(process.cwd(), 'csv-exported', `ALL_${know}`);
                if (!fs.existsSync(exportDir)) {
                    fs.mkdirSync(exportDir, { recursive: true });
                }

                // ----------- CSV CALLS -----------
                const header = [
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
                    "TotalDuration"
                ];

                const rows = await allCalls.map(call => [
                    call.call_id,
                    formatDate(call.date_start),
                    formatDate(call.date_answer),
                    // dayjs(call.date_start).format('DD/MM/YYYY HH:mm:ss'),
                    // dayjs(call.date_answer).format('DD/MM/YYYY HH:mm:ss'),
                    call.user_id,
                    call.user_name,
                    call.from_number,
                    call.to_number,
                    call.client_name,
                    call.direction,
                    call.is_answered != null && call.is_answered == 1 ? "TRUE" : "FALSE",
                    call.last_state,
                    call.duration
                ]);

                const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

                const filePath = path.join(exportDir, `Fichier_final_SPM_-_Agent_non_compile_Ringover_${jj}_${mm}_${know}.csv`);
                await fs.writeFileSync(filePath, csv);

                // ----------- CSV CALL IN -----------

                const rowsIn = await allCallInStats.map(r => [
                    dayjs(r.time_15min).format('DD/MM/YYYY'),
                    dayjs(r.time_15min).format('HH:mm:ss'),
                    r.client_name,
                    r.nb_call,
                    r.call_answer,
                    r.call_missed,
                    r.total_duration,
                    r.avg_duration,
                    '"' + r.answer_rate + '"'
                ]);

                const totalsIn = await allCallInStats.reduce((acc, r) => {
                    acc.date = dayjs(r.time_15min).format('DD/MM/YYYY');
                    acc.nb_call += Number(r.nb_call);
                    acc.call_answer += Number(r.call_answer);
                    acc.call_missed += Number(r.call_missed);
                    acc.total_duration += Number(r.total_duration);
                    return acc;
                }, {
                    nb_call: 0,
                    call_answer: 0,
                    call_missed: 0,
                    total_duration: 0
                });
                // Moyenne durée
                totalsIn.avg_duration = totalsIn.nb_call
                    ? (totalsIn.total_duration / totalsIn.nb_call).toFixed(2)
                    : 0;

                // Taux de réponse
                totalsIn.answer_rate = totalsIn.nb_call
                    ? ((totalsIn.call_answer / totalsIn.nb_call) * 100).toFixed(2).replace('.', ',') + '%'
                    : '0,00%';

                const totalRowIn = [
                    'Total pour '+ totalsIn.date,                         // Date vide
                    '',                    // Label
                    '',                         // IVRName vide
                    totalsIn.nb_call,
                    totalsIn.call_answer,
                    totalsIn.call_missed,
                    totalsIn.total_duration,
                    totalsIn.avg_duration,
                    '"' + totalsIn.answer_rate + '"'
                ];

                const csvIn = [
                    "Date du jour,Intervalle 15 min,IVRName,Nombre d'appels reçus,Appels Répondus,Appels Perdus,Durée totale d'appel,Durée moyenne d'appel,Taux de réponse",
                    ...rowsIn.map(r => r.join(',')),
                    totalRowIn.join(',') 
                ].join('\n');

                const filePathIn = path.join(exportDir, `Fichier_final_SPM_-_TCD_(CDN_par_quart_d_heure)_${jj}_${mm}_${know}.csv`);
                await fs.writeFileSync(filePathIn, csvIn);

                // ----------- CSV CALL OUT -----------

                const rowsOut = await allCallOutStats.map(r => [
                    dayjs(r.time_15min).format('DD/MM/YYYY'),
                    dayjs(r.time_15min).format('HH:mm:ss'),
                    r.client_name,
                    r.nb_call,
                    r.call_answer,
                    r.call_missed,
                    r.total_duration,
                    r.avg_duration,
                    '"' + r.answer_rate + '"'
                ]);

                const totalsOut = await allCallOutStats.reduce((acc, r) => {
                    acc.date = dayjs(r.time_15min).format('DD/MM/YYYY');
                    acc.nb_call += Number(r.nb_call);
                    acc.call_answer += Number(r.call_answer);
                    acc.call_missed += Number(r.call_missed);
                    acc.total_duration += Number(r.total_duration);
                    return acc;
                }, {
                    nb_call: 0,
                    call_answer: 0,
                    call_missed: 0,
                    total_duration: 0
                });
                // Moyenne durée
                totalsOut.avg_duration = totalsOut.nb_call
                    ? (totalsOut.total_duration / totalsOut.nb_call).toFixed(2)
                    : 0;

                // Taux de réponse
                totalsOut.answer_rate = totalsOut.nb_call
                    ? ((totalsOut.call_answer / totalsOut.nb_call) * 100).toFixed(2).replace('.', ',') + '%'
                    : '0,00%';

                const totalRowOut = [
                    'Total pour '+ totalsOut.date,                         // Date vide
                    '',                    // Label
                    '',                         // IVRName vide
                    totalsOut.nb_call,
                    totalsOut.call_answer,
                    totalsOut.call_missed,
                    totalsOut.total_duration,
                    totalsOut.avg_duration,
                    '"' + totalsOut.answer_rate + '"'
                ];

                const csvOut = [
                    "Date du jour,Intervalle 15 min,IVRName,Nombre d'appels reçus,Appels Répondus,Appels Perdus,Durée totale d'appel,Durée moyenne d'appel,Taux de réponse",
                    ...rowsOut.map(r => r.join(',')),
                    totalRowOut.join(',') 
                ].join('\n');

                const filePathOut = path.join(exportDir, `Fichier_final_SPM_-_TCD_OUT_(CDN_par_quart_d_heure)_${jj}_${mm}_${know}.csv`);
                await fs.writeFileSync(filePathOut, csvOut);

                this.logger.log('Export ALL IN ONE terminé');

                // save the export operation
                await this.exportModel.create({
                    export_type: ExportTypeEnum.csv_stats,
                    file_path: `/csv-exported/ALL/Fichier_final_SPM_-_Agent_non_compile_Ringover_${jj}_${mm}_${know}.csv, /csv-exported/ALL/Fichier_final_SPM_-_TCD_(CDN_par_quart_d_heure)_${jj}_${mm}_${know}.csv, /csv-exported/ALL/Fichier_final_SPM_-_TCD_OUT_(CDN_par_quart_d_heure)_${jj}_${mm}_${know}.csv`,
                    status: StatusType.success,
                    error_message: null,
                    historique_lecture_id: histoId
                } as any);

                // ----------- EMAIL -----------
                await this.email.sendMultiCsvEmail(
                    [
                        { filePath, fileName: `Fichier final SPM - Agent non compile Ringover ${jj}_${mm}.csv` },
                        { filePath: filePathIn, fileName: `Fichier final SPM - TCD (CDN_par_quart_d'heure) ${jj}_${mm}.csv` },
                        { filePath: filePathOut, fileName: `Fichier final SPM - TCD OUT (CDN_par_quart_d_heure) ${jj}_${mm}.csv` }
                    ],
                    `Export GLOBAL du ${jj}_${mm}`,
                    ` Bonjour,\n Le traitement du fichier CSV a été effectué avec succès.\n Les données ont été intégrées et sont désormais disponibles pour exploitation.\n N’hésitez pas à revenir vers moi si vous souhaitez des vérifications complémentaires ou des informations supplémentaires.\n\n Bien cordialement,`
                );

                await this.ftp.uploadFile(filePath, `export/ringover/agent/Fichier final SPM - Agent non compile Ringover ${jj}_${mm}.csv`);
                await this.ftp.uploadFile(filePathIn, `export/ringover/cdn/Fichier final SPM - TCD (CDN_par_quart_d'heure) ${jj}_${mm}.csv`);

                await this.email.sendEmailNotification(
                    [],
                    `Envoie ftp reussi`,
                    ` Bonjour,\n Le traitement du fichier CSV a été effectué avec succès.\n\n Les fichiers générés ont été envoyés :\n - export/ringover/agent/Fichier final SPM - Agent non compilé Ringover ${jj}_${mm}.csv\n - export/ringover/cdn/Fichier final SPM - TCD (CDN_par_quart_d'heure) ${jj}_${mm}.csv\n\n Les données sont désormais disponibles pour exploitation.\n\n Bien cordialement
                    `
                );

            }catch(error){
                
                await this.email.sendEmailNotification(
                    [],
                    `Erreur lors du traitement d'export des fichiers | historique : ${histoId}`,
                    `ERROR: ${(error as Error).message}`
                );

            }

        }
    }
}
