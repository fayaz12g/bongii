const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const openConnection = (databasePath) => new Promise((resolve, reject) => {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const raw = new sqlite3.Database(databasePath, (error) => {
    if (error) {
      reject(error);
      return;
    }

    raw.configure('busyTimeout', 5000);

    const connection = {
      run(sql, params = []) {
        return new Promise((resolveRun, rejectRun) => {
          raw.run(sql, params, function onRun(runError) {
            if (runError) {
              rejectRun(runError);
              return;
            }
            resolveRun({ changes: this.changes, lastID: this.lastID });
          });
        });
      },
      get(sql, params = []) {
        return new Promise((resolveGet, rejectGet) => {
          raw.get(sql, params, (getError, row) => {
            if (getError) rejectGet(getError);
            else resolveGet(row);
          });
        });
      },
      all(sql, params = []) {
        return new Promise((resolveAll, rejectAll) => {
          raw.all(sql, params, (allError, rows) => {
            if (allError) rejectAll(allError);
            else resolveAll(rows);
          });
        });
      },
      exec(sql) {
        return new Promise((resolveExec, rejectExec) => {
          raw.exec(sql, (execError) => {
            if (execError) rejectExec(execError);
            else resolveExec();
          });
        });
      },
      close() {
        return new Promise((resolveClose, rejectClose) => {
          raw.close((closeError) => {
            if (closeError) rejectClose(closeError);
            else resolveClose();
          });
        });
      },
    };

    resolve(connection);
  });
});

const configureConnection = async (connection) => {
  await connection.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  return connection;
};

module.exports = { configureConnection, openConnection };