import { DatabaseRecord } from "./database-record";

export interface IDatabase {
    getRecords(): Promise<DatabaseRecord[]>;
    updateRecord(record: DatabaseRecord): Promise<boolean>;
}