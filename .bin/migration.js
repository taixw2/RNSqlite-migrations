#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const bundlePath = process.argv[2] || process.cwd();
const mgtFileExp = /^\d+_\w+$/;

fs.stat(
  bundlePath,
  function (error, state) {
    if (error) {
      console.error('bundle path invalid', bundlePath);
      console.error(error)
      return;
    }
    if (!state.isDirectory()) {
      console.error('bundle path not a directoy', bundlePath);
      return;
    }

    function getMigrationInfoCallback(successFileInfos, failFileInfos) {
      console.info('will write migration file');
      fs.writeFile(
        path.resolve(bundlePath, 'bundle.json'),
        JSON.stringify(successFileInfos, undefined, 4),
        function (error) {
          if (error) {
            console.error('write bundle.json faile')
            console.error(error)
            return
          }
          console.info('write bundle.json success!!!');
        }
      )
      if (failFileInfos.length) {
        console.warn(
          "An error has occurred in these files",
          failFileInfos.map(function (fileInfo) {
            return [fileInfo.version, fileInfo.name].join('_')
          })
        )
      }
    }

    function readMigrationFileCallback(filePaths) {
      console.info('will read migration files');
      if (!filePaths.length) {
        console.info('no match migration files with number_string, 100001_alter-User-user');
        return;
      }
      getMigrationInfo(filePaths, getMigrationInfoCallback)
    }

    console.info('wait, please!');
    readMigrationFile(bundlePath, readMigrationFileCallback)
  }
)

function getMigrationInfo(migrationFiles, callback) {
  const filesInfos = [];
  migrationFiles.forEach(
    function (filePath) {
      const fileMeta = getMigrationFileMete(filePath);
      const fileInfo = {
        state: 'pending',
        version: Number(fileMeta.version),
        name: fileMeta.name,
        statement: [],
      }
      filesInfos.push(fileInfo);
      fs.readFile(
        filePath,
        function (error, content) {
          fileInfo.state = error ? 'reject' : 'resolve';
          fileInfo.statement = content.toString().split(/____+/).map(v => v.replace(/^\n+/, '').replace(/\n+$/, ''))
          const complete = filesInfos.every(function (fileInfo) {
            return fileInfo.state !== 'pending'
          })

          console.info(
            'read file',
            filePath,
            fileInfo.state,
            complete
          )

          if (complete) {
            callback(
              filesInfos.filter(
                function (fileInfo) { return fileInfo.state === 'resolve' }
              ),
              filesInfos.filter(
                function (fileInfo) { return fileInfo.state === 'reject' }
              ),
            )
          }
        }
      )
    }
  )
}

function getMigrationFileMete(filePath) {
  const basename = path.basename(filePath, '.mgt');
  const splitInfo = basename.split('_');
  return {
    version: splitInfo.shift(),
    name: splitInfo.join('_')
  }
}

function readMigrationFile(directoryPath, callback) {
  fs.readdir(
    directoryPath,
    function (error, files) {
      if (error) {
        console.error('read bundle directory fail', error);
        callback([]);
        return;
      }
      callback(
        files
          .map(function (file) {
            if (!mgtFileExp.test(file)) { return ''; }
            return path.resolve(directoryPath, file);
          })
          .filter(function (validFile) { return !!validFile })
      )
    }
  )
}

