import SQLite from "react-native-sqlite-storage";
import Table, { Const } from 'rn-sqlite-table';
import { log } from './utils';

type VersionInfo = { version: number, name: string, statement: string | string[] };

const TABLE_NAME = 'migration_version';
export default class Miration {
  public version = '1.0.1'
  private table  = Table(TABLE_NAME);

  constructor(
    private db: SQLite.SQLiteDatabase,
    private bundleContent: string | Array<VersionInfo>,
    private DEBUGG: boolean = false
  ) { }

  private getMigrationData() {
    if (typeof this.bundleContent === 'string') {
      try {
        const data = JSON.parse(this.bundleContent)
        if (Array.isArray(data)) {
          return data;
        }
        log('warn', 'bundleContent is not a array', data);
        return [];
      } catch (error) {
        log('error', 'bundleContent parse error', error);
        return [];
      }
    }
    if (Array.isArray(this.bundleContent)) {
      return this.bundleContent;
    }
    return [];
  }

  private createMirationTable(tx: SQLite.Transaction) {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (\`version\` INTEGER NOT NULL PRIMARY KEY)`,
      [],
    )
  }

  private getMigrationTableData(): Promise<any> {
    const stmtInfo = this.table.select('version').query()
    log('info', 'will get current version')
    return new Promise(
      (resolve, reject) => {
        this.db.executeSql(
          stmtInfo.stmt, [], (result) => resolve(result as any), reject
        )
      }
    )
  }

  private async updateVersion(version: number) {
    const stmtInfo = this.table.insert({ version }, Const.WriteAction.REPLACE).query();
    return await this.transaction(
      (tx) => {
        tx.executeSql(stmtInfo.stmt, stmtInfo.value)
      }
    )
  }

  private async transaction(txCallback: (tx: SQLite.Transaction) => void) {
    return new Promise(
      (resolve, reject) => {
        this.db.transaction(
          txCallback,
          reject,
          resolve,
        )
      }
    )
  }

  // 流程：
  // 创建版本表，如果不存在
  // 获取当前最新版本号
  // 获取需要更新的语句
  // 过滤已经更新过的语句(通过版本号对比)
  // 对语句根据版本号排序
  // 事务执行
  async update() {
    try {
      // 当前版本信息
      await this.transaction((tx) => this.createMirationTable(tx));
      const { rows } = await this.getMigrationTableData();
      const item = rows.length ? rows.item(0) : { version: 0 }
      const currentVersion = item.version;
      log('info', 'currentVersion', currentVersion, rows.item(0));

      // 升级数据
      const mirgationData = this.getMigrationData()
      const filterMirgationData = mirgationData.filter(({ version }) => version > currentVersion)
      const sortMirgationData = filterMirgationData.sort((cur, next) => cur.version - next.version)
      log('info', 'sortMirgationData count', sortMirgationData.length);
      if (!sortMirgationData.length) { return; }
  
      // 执行事务
      await this.transaction(
        (tx) => {
          sortMirgationData.forEach(
            (versionInfo: VersionInfo) => {
              if (Array.isArray(versionInfo.statement)) {
                versionInfo.statement.forEach(
                  statement => tx.executeSql(statement)
                );
              } else {
                tx.executeSql(versionInfo.statement)
              }
            }
          )
        }
      );
      log('info', 'migration complete', 'count: ', mirgationData.length, 'reality：', sortMirgationData.length);
    } catch (error) {
      log('error', 'error', error)
    }
  }
}
