import SQLite from "react-native-sqlite-storage";
import Table from 'rn-sqlite-table';

const TABLE_NAME = 'migration_version';
export default class Miration {
  constructor(
    private db: SQLite.SQLiteDatabase,
    private bundleContent: string | Array<{ version: number, name: string, statement: string }>
  ) { }

  private table = Table(TABLE_NAME);
  private createMirationTable() {
    return this.db.executeSql(
      `CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (\`version\` INTEGER NOT NULL PRIMARY KEY)`
    );
  }

  private async getCurrentVersion() {
    try {
      const stmtInfo = this.table.select('version').query()
      const result = await this.db.executeSql(stmtInfo.stmt)
      return result[0].rows.item(0).version || 0
    } catch (error) {
      console.error('get current version fail', error);
      return {}
    }
  }

  private updateVersion(version: number) {
    const stmtInfo = this.table.update({ version }).query();
    return this.db.executeSql(
      stmtInfo.stmt,
      stmtInfo.value
    );
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

  async update() {
    await this.createMirationTable();
    const currentVersion = await this.getCurrentVersion();
    if (typeof currentVersion === 'undefined') { return; }
    const needStatementInfo = this.getMigrationData().filter(({ version }) => version > currentVersion);
    const sortStatement = needStatementInfo.sort((cur, next) => cur.version - next.version)
    this.db.transaction(
      (tx) => {
        sortStatement.forEach(
          (statementInfo) => {
            tx.executeSql(statementInfo.statement)
          }
        )
      }
    )
  }
}
