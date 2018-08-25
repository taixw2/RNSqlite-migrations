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

// 尝试创建升级表
// 读取升级信息
// 过滤掉比当前小的等级信息
// 对这些升级数据进行排序
// 顺序执行

// 获取某个文件夹/当前文件夹下的所有 .mgt 文件
// 读取文件名词 version_name == [version, name]
// 生成 json = { version, name, statement }


// import SQLite from "react-native-sqlite-storage";

// // migration(db, 20180818203644)
// // .update(
// //   (command, version) => {
// //     command.execute().version(1)
// //     command.addColumn().version(1)
// //     command.deleteColumn().version(1)
// //     command.updateColumn().version(1)
// //     command.deleteTable().version(1)
// //     command.createTable().version(1)
// //   }
// // )

// interface IStatementVersion {
//   statement: string,
//   version: number
// }

// type UpdateSacpe = (command: Command, version: number) => void

// class Command {

//   statements: IStatementVersion[]

//   constructor(
//     public db: SQLite.SQLiteDatabase,
//     public version: number
//   ) {}

//   private merage(statement) {
//     return {
//       version: (versionNumber) => {
//         this.statements.push({ statement, version: versionNumber })
//       }
//     }
//   }

//   execute(statement: string) {
//     return this.merage(statement)
//   }
// }

// class Migration {
//   private currentVersion: number = 0
//   constructor(
//     public db: SQLite.SQLiteDatabase,
//     public newVersion: number
//   ) {}

//   async initial() {}

//   async update(updaeteScape:UpdateSacpe) {
//     await this.initial()
//     const command = new Command(this.db, this.newVersion)
//     updaeteScape(command, 0)
//   }
// }

// export default (...args:[SQLite.SQLiteDatabase, number]) => new Migration(...args)
