import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'fretagru.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class DatabaseWrapper {
  private _db: SqlJsDatabase | null = null;
  private _ready: Promise<void>;

  constructor() {
    this._ready = this._init();
  }

  private async _init() {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buf = fs.readFileSync(DB_PATH);
      this._db = new SQL.Database(buf);
    } else {
      this._db = new SQL.Database();
    }
    this._db.run('PRAGMA foreign_keys = ON');
  }

  async ready() {
    await this._ready;
  }

  private get db(): SqlJsDatabase {
    if (!this._db) throw new Error('Database not initialized');
    return this._db;
  }

  private save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }

  exec(sql: string) {
    this.db.run(sql);
    this.save();
  }

  prepare(sql: string) {
    const self = this;
    return {
      all(...params: any[]): any[] {
        const stmt = self.db.prepare(sql);
        stmt.bind(params.length > 0 ? params : undefined);
        const rows: any[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      },
      get(...params: any[]): any {
        const stmt = self.db.prepare(sql);
        stmt.bind(params.length > 0 ? params : undefined);
        let row: any = undefined;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      },
      run(...params: any[]) {
        self.db.run(sql, params);
        self.save();
      },
    };
  }

  close() {
    this.save();
    this.db.close();
  }
}

const db = new DatabaseWrapper();
export default db;
