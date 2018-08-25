
## sqlite migration

基于 react-native-sqlite-storage， 能够很简单的对 db 进行迭代升级。

### 使用方法:

可参考项目： [taixw2/wechat-for-react-native](https://github.com/taixw2/wechat-for-react-native)

1. 安装依赖
```
yarn add rn-sqlite-migration
//
npm install rn-sqlite-migration
```
2. 在项目中创建一个目录 migration.bundle (目录名任意)
3. 创建升级语句文件， 格式为： 版本号_描述, 如: 20381220200147_renameUser
4. 输入升级语句： ALTER TABLE Uesr RENAME TO User;
5. 执行命令生成对应的 JSON
```
  yarn migration ./migration.bundle
```

*以上 2 - 5 可以省略， 如果你提供以下结构的对象*

```
[
  {
    "version": number,
    "name": string,
    "statement": string
  },
  ...
]
```

6. 在项目中使用
```
import SQLite from "react-native-sqlite-storage";
import Migration from "rn-sqlite-migration";

/// 不使用 promise
this.db = SQLite.openDatabase(
  { name: "wechat.db", location: "default", createFromLocation: 1 },
  async () => {
    const migration = new Migration(
      this.db,
      require("./migrations.bundle/bundle.json"), // 传入对应的数据
    );
    await migration.update();
  },
  (e) => console.error("db error", e)
);

```



