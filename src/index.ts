import SQLite from "react-native-sqlite-storage";
import Table from 'rn-sqlite-table';

const TABLE_NAME = 'migration_version';
export default class Miration {
  constructor(
    private db: SQLite.SQLiteDatabase,
    private bundleContent: string | Array<{ version: number, name: string, statement: string }>
  ) { }

  private table = Table(TABLE_NAME);
  private createMirationTable(tx: SQLite.Transaction) {
    return new Promise(
      (resolve, reject) => {
        this.db.executeSql(
          `CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (\`version\` INTEGER NOT NULL PRIMARY KEY)`,
          [],
          resolve,
          reject
        );
      }
    )
  }

  private getCurrentVersion(tx: SQLite.Transaction) {
    try {
      const stmtInfo = this.table.select('version').query()
      return new Promise(
        (resolve, reject) => {
          tx.executeSql(stmtInfo.stmt, [],
            (_, result) => {
              resolve(result.rows.item(0).version)
            },
            reject
          )
        }
      )
    } catch (error) {
      console.error('get current version fail', error);
      return Promise.resolve({})
    }
  }

  private updateVersion(version: number) {
    const stmtInfo = this.table.update({ version }).query();
    this.db.transaction(
      (tx) => {
        tx.executeSql(stmtInfo.stmt, stmtInfo.value)
      }
    )
  }

  private getMigrationData() {
    if (typeof this.bundleContent === 'string') {
      try {
        const data = JSON.parse(this.bundleContent)
        if (Array.isArray(data)) {
          return data;
        }
        console.warn('bundleContent is not a array', data);
        return [];
      } catch (error) {
        console.error('bundleContent parse error', error);
        return [];
      }
    }

    if (Array.isArray(this.bundleContent)) {
      return this.bundleContent;
    }
    console.warn('bundle content invalid');
    return [];
  }

  async transaction(success?: SQLite.TransactionCallback): Promise<SQLite.Transaction> {
    return (new Promise(
      (resolve, reject) => {
        this.db.transaction(
          tx => resolve(tx),
          reject,
          success
        )
      }
    )) as Promise<SQLite.Transaction>
  }

  async update() {
    const ctx = await this.transaction()
    await this.createMirationTable(ctx);
    const gtx = await this.transaction()
    const currentVersion = await this.getCurrentVersion(gtx)
    if (typeof currentVersion === 'undefined') { return; }

    const mirgationData = this.getMigrationData()
    const filterMirgationData = mirgationData.filter(({ version }) => version > currentVersion)
    const sortMirgationData = filterMirgationData.sort((cur, next) => cur.version - next.version)

    const etx = await this.transaction(
      () => { this.updateVersion(sortMirgationData[sortMirgationData.length - 1].version) }
    )
    sortMirgationData.forEach(
      (statementInfo) => etx.executeSql(statementInfo.statement)
    )
  }
}
