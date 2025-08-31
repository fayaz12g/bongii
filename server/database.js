const sqlite3 = require('sqlite3').verbose();

const DB_FILE = "/data/test.db";

// Sqlite 3 Database
let db;

// Initialize Database from File
const init = () => {
  console.log("Initializing Database...");

  // Connect to database file
  console.log("Connecting to database file " + DB_FILE);
  db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
      console.error("Error opening database from file: ", err);
    } else {
      console.log("Connected to database file successfully");
    }
  });

  // Create a "users" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      password TEXT,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      profileIcon TEXT
    )
  `, (err) => {
    if (err) {
      console.error("Error creating users table:", err);
    } else {
      console.log("Users table created or already exists");
    }
  });

  // Create a "timeRequests" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS timeRequests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      body TEXT,
      link TEXT,
      tag TEXT,
      owner TEXT,
      completed BOOLEAN
    )
  `, (err) => {
    if (err) {
      console.error("Error creating timeRequests table:", err);
    } else {
      console.log("timeRequests table created or already exists");
    }
  });

  // Create a "timeSlots" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS timeSlots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER,
      start TEXT,
      end TEXT
    )
  `, (err) => {
    if (err) {
      console.error("Error creating timeSlots table:", err);
    } else {
      console.log("timeSlots table created or already exists");
    }
  });

  // Create a "financeRequests" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS financeRequests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      body TEXT,
      link TEXT,
      goal TEXT,
      tag TEXT,
      owner TEXT,
      completed BOOLEAN
    )
  `, (err) => {
    if (err) {
      console.error("Error creating finalRequests table:", err);
    } else {
      console.log("financeRequests table created or already exists");
    }
  });

  // Create an "itemRequests" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS itemRequests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      body TEXT,
      link TEXT,
      tag TEXT,
      owner TEXT,
      completed BOOLEAN
    )
  `, (err) => {
    if (err) {
      console.error("Error creating itemRequests table:", err);
    } else {
      console.log("itemRequests table created or already exists");
    }
  });

  // Create an "items" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER,
      name TEXT,
      quantity TEXT
    )
  `, (err) => {
    if (err) {
      console.error("Error creating items table:", err);
    } else {
      console.log("items table created or already exists");
    }
  });

  // Create a "comments" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      requestId INTEGER,
      userId INTEGER,
      message TEXT,
      datePosted TEXT
    )
  `, (err) => {
    if (err) {
      console.error("Error creating comments table:", err);
    } else {
      console.log("comments table created or already exists");
    }
  });
}

// DEBUG: Clear all data from the db
const clean = () => {
  db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
    if (err) {
      console.error(err);
      return;
    }

    tables.forEach(table => {
      const tableName = table.name;
      db.run(`DROP TABLE IF EXISTS ${tableName};`, function (err) {
        if (err) {
          console.error(`Error dropping ${tableName}:`, err);
        } else {
          console.log(`Dropped table ${tableName}`);
        }
      });
    });
  });
}

// Add a new user
const addUser = (userData) => {
  console.log("Adding user with data ", userData);
  return new Promise((resolve, reject) => {
    const { username, password, firstName, lastName, email, profileIcon } = userData;
    if (username && password && firstName && lastName) {
      db.run(
        "INSERT INTO users (username, password, firstName, lastName, email, profileIcon) VALUES (?, ?, ?, ?, ?, ?)",
        [username, password, firstName, lastName, email, profileIcon],
        function(err) {
          if (err) {
            console.error('Error inserting user: ', err);
            reject(err);
          } else {
            const addedUserData = getUser(this.lastID);
            resolve(addedUserData);
          }
        }
      );
    } else {
      reject("Required field(s) not provided");
    }
  });
};

const updateUser = (userData) => {
  console.log("Updating user with data ", userData);
  return new Promise((resolve, reject) => {
    const { id, username, password, firstName, lastName, email, profileIcon } = userData;
    if (id && username && password && firstName && lastName) {
      db.run(
        "UPDATE users SET username = ?, password = ?, firstName = ?, lastName = ?, email = ?, profileIcon = ? WHERE id = ?",
        [username, password, firstName, lastName, email, profileIcon, id],
        function(err) {
          if (err) {
            console.error('Error updating user: ', err);
            reject(err);
          } else {
            const updatedUserData = getUser(id);
            resolve(updatedUserData);
          }
        }
      );
    } else {
      reject("Required field(s) not provided");
    }
  });
};

// Get a user by id
const getUser = (id) => {
  console.log('Getting user with id ', id);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        console.error('Error getting user by id:', err);
        reject(err);
      } else {
        console.log('Found user:', user);
        resolve(user);
      }
    });
  });
};

// Get a user by username
const getUserByUsername = (username) => {
  console.log('Getting user with username ', username);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        console.error('Error getting user by username:', err);
        reject(err);
      } else {
        console.log('Found user:', user);
        resolve(user);
      }
    });
  });
};

// Get a user by id
const getAllUsers = () => {
  console.log('Getting all users');
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users', (err, users) => {
      if (err) {
        console.error('Error all users:', err);
        reject(err);
      } else {
        console.log('Found users: ', users);
        resolve(users);
      }
    });
  });
};

// Add a new time request
const addTimeRequest = (owner, timeRequestData) => {
  console.log("Adding time request with data ", timeRequestData);
  return new Promise((resolve, reject) => {
    const { title, body, link, tag, timeSlots } = timeRequestData;
    if (title && body && tag && owner && timeSlots) {
      db.run(
        "INSERT INTO timeRequests (title, body, link, tag, owner, completed) VALUES (?, ?, ?, ?, ?, ?)",
        [title, body, link, tag, owner, false],
        function(err) {
          if (err) {
            console.error('Error inserting timeRequest: ', err);
            reject(err);
          } else {
            console.log("adding timeslots" + JSON.stringify(timeSlots) + " to request " + this.lastID);
            for (let timeSlot of timeSlots) {
              console.log("adding " + timeSlot.start + " - " + timeSlot.end);
              db.run(
                "INSERT INTO timeSlots (requestId, start, end) VALUES (?, ?, ?)",
                [this.lastID, timeSlot.start, timeSlot.end],
                function(err) {
                  if (err) {
                    console.error('Error inserting timeSlot: ', err);
                    reject(err);
                  }
                }
              );
            }

            const addedRequestData = getTimeRequest(this.lastID);
            resolve(addedRequestData);
          }
        }
      );
    } else {
      reject("Required field(s) not provided");
    }
  });
};

// Mark time request as completed
const markTimeRequestCompleted = (id) => {
  console.log("Marking time request completed");
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE timeRequests SET completed = ? WHERE id = ?",
      [true, id],
      function(err) {
        if (err) {
          console.error('Error completing time request: ', err);
          reject(err);
        } else {
          const updatedTimeRequest = getTimeRequest(id);
          resolve(updatedTimeRequest);
        }
      }
    );
  });
};

// Get a time request by id
const getTimeRequest = (id) => {
  console.log('Getting time request with id ', id);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM timeRequests WHERE id = ?', [id], (err, timeRequest) => {
      if (err) {
        console.error('Error getting time request by id:', err);
        reject(err);
      } else {
        console.log('Found time request:', timeRequest);
        resolve(timeRequest);
      }
    });
  });
};

// Get all time request
const getAllTimeRequests = () => {
  console.log('Getting all time requests');
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM timeRequests', (err, timeRequests) => {
      if (err) {
        console.error('Error getting all time requests:', err);
        reject(err);
      } else {
        console.log('Found time requests: ', timeRequests);
        resolve(timeRequests);
      }
    });
  });
};

// Get a time slot by id
const getTimeSlot = (id) => {
  console.log('Getting time slot with id ', id);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM timeSlots WHERE id = ?', [id], (err, timeSlot) => {
      if (err) {
        console.error('Error getting time slot by id:', err);
        reject(err);
      } else {
        console.log('Found time slot:', timeSlot);
        resolve(timeSlot);
      }
    });
  });
};

// Get a time slots by request id
const getTimeSlotsByRequest = (id) => {
  console.log('Getting time slot with request id ', id);
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM timeSlots WHERE requestId = ?', [id], (err, timeSlots) => {
      if (err) {
        console.error('Error getting time slots by request id:', err);
        reject(err);
      } else {
        console.log('Found time slots:', timeSlots);
        resolve(timeSlots);
      }
    });
  });
};

// Add a new finance request
const addFinanceRequest = (owner, financeRequestData) => {
  console.log("Adding finance request with data ", financeRequestData);
  return new Promise((resolve, reject) => {
    const { title, body, link, tag, goal } = financeRequestData;
    if (title && body && tag && goal && owner) {
      db.run(
        "INSERT INTO financeRequests (title, body, link, tag, owner, completed, goal) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [title, body, link, tag, owner, false, goal],
        function(err) {
          if (err) {
            console.error('Error inserting financeRequest: ', err);
            reject(err);
          } else {
            const addedRequestData = getFinanceRequest(this.lastID);
            resolve(addedRequestData);
          }
        }
      );
    } else {
      reject("Required field(s) not provided");
    }
  });
};

// Mark finance request as completed
const markFinanceRequestCompleted = (id) => {
  console.log("Marking finance request completed");
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE financeRequests SET completed = ? WHERE id = ?",
      [true, id],
      function(err) {
        if (err) {
          console.error('Error completing finance request: ', err);
          reject(err);
        } else {
          const updatedFinanceRequest = getFinanceRequest(id);
          resolve(updatedFinanceRequest);
        }
      }
    );
  });
};

// Get a finance request by id
const getFinanceRequest = (id) => {
  console.log('Getting finance request with id ', id);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM financeRequests WHERE id = ?', [id], (err, financeRequest) => {
      if (err) {
        console.error('Error getting finance request by id:', err);
        reject(err);
      } else {
        console.log('Found finance request:', financeRequest);
        resolve(financeRequest);
      }
    });
  });
};

// Get a finance by id
const getAllFinanceRequests = () => {
  console.log('Getting all finance requests');
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM financeRequests', (err, financeRequests) => {
      if (err) {
        console.error('Error getting all finance requests:', err);
        reject(err);
      } else {
        console.log('Found finance requests: ', financeRequests);
        resolve(financeRequests);
      }
    });
  });
};

// Add a new item request
const addItemRequest = (owner, itemRequestData) => {
  console.log("Adding item request with data ", itemRequestData);
  return new Promise((resolve, reject) => {
    const { title, body, link, tag, items } = itemRequestData;
    if (title && body && tag && items && owner) {
      db.run(
        "INSERT INTO itemRequests (title, body, link, tag, owner, completed) VALUES (?, ?, ?, ?, ?, ?)",
        [title, body, link, tag, owner, false],
        function(err) {
          if (err) {
            console.error('Error inserting itemRequest: ', err);
            reject(err);
          } else {
            console.log("adding items" + JSON.stringify(items) + " to request " + this.lastID);
            for (let item of items) {
              console.log("adding " + item.name + " (" + item.quantity + ")");
              db.run(
                "INSERT INTO items (requestId, name, quantity) VALUES (?, ?, ?)",
                [this.lastID, item.name, item.quantity],
                function(err) {
                  if (err) {
                    console.error('Error inserting item: ', err);
                    reject(err);
                  }
                }
              );
            }

            const addedRequestData = getItemRequest(this.lastID);
            resolve(addedRequestData);
          }
        }
      );
    } else {
      reject("Required field(s) not provided");
    }
  });
};

// Mark item request as completed
const markItemRequestCompleted = (id) => {
  console.log("Marking item request completed");
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE itemRequests SET completed = ? WHERE id = ?",
      [true, id],
      function(err) {
        if (err) {
          console.error('Error completing item request: ', err);
          reject(err);
        } else {
          const updatedItemRequest = getItemRequest(id);
          resolve(updatedItemRequest);
        }
      }
    );
  });
};

// Get an item request by id
const getItemRequest = (id) => {
  console.log('Getting item request with id ', id);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM itemRequests WHERE id = ?', [id], (err, itemRequest) => {
      if (err) {
        console.error('Error getting item request by id:', err);
        reject(err);
      } else {
        console.log('Found item request:', itemRequest);
        resolve(itemRequest);
      }
    });
  });
};

// Get all item requests
const getAllItemRequests = () => {
  console.log('Getting all item requests');
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM itemRequests', (err, itemRequests) => {
      if (err) {
        console.error('Error getting all item requests:', err);
        reject(err);
      } else {
        console.log('Found item requests: ', itemRequests);
        resolve(itemRequests);
      }
    });
  });
};

// Get an item by id
const getItem = (id) => {
  console.log('Getting item with id ', id);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM items WHERE id = ?', [id], (err, item) => {
      if (err) {
        console.error('Error getting item by id:', err);
        reject(err);
      } else {
        console.log('Found item:', item);
        resolve(item);
      }
    });
  });
};

// Get items by request id
const getItemsByRequest = (id) => {
  console.log('Getting items with request id ', id);
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM items WHERE requestId = ?', [id], (err, items) => {
      if (err) {
        console.error('Error getting items by request id:', err);
        reject(err);
      } else {
        console.log('Found items:', items);
        resolve(items);
      }
    });
  });
};

// Add a new comment
const addComment = (type, userId, commentData) => {
  console.log(`Adding ${type} comment with data `, commentData);
  return new Promise((resolve, reject) => {
    const { requestId, message, datePosted } = commentData;
    if (type && requestId && userId && message && datePosted) {
      db.run(
        "INSERT INTO comments (type, requestId, userId, message, datePosted) VALUES (?, ?, ?, ?, ?)",
        [type, requestId, userId, message, datePosted],
        function(err) {
          if (err) {
            console.error('Error inserting comments: ', err);
            reject(err);
          } else {
            const addedCommentData = getComment(this.lastID);
            resolve(addedCommentData);
          }
        }
      );
    } else {
      reject("Required field(s) not provided");
    }
  });
};

// Get comment by id
const getComment = (id) => {
  console.log('Getting comment with id ', id);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM comments WHERE id = ?', [id], (err, comment) => {
      if (err) {
        console.error('Error getting comment by id:', err);
        reject(err);
      } else {
        console.log('Found comment:', comment);
        resolve(comment);
      }
    });
  });
};

// Get comments by request id
const getCommentsByRequestTypeId = (type, requestId) => {
  console.log(`Getting comments with ${type} request id  ${requestId}`);
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM comments WHERE type = ? AND requestId = ?', [type, requestId], (err, comment) => {
      if (err) {
        console.error('Error getting comment by requestId:', err);
        reject(err);
      } else {
        console.log('Found comment:', comment);
        resolve(comment);
      }
    });
  });
};

module.exports = {
  init,
  clean,
  addUser,
  updateUser,
  getUser,
  getUserByUsername,
  getAllUsers,
  addTimeRequest,
  getTimeRequest,
  markTimeRequestCompleted,
  getAllTimeRequests,
  getTimeSlot,
  getTimeSlotsByRequest,
  addFinanceRequest,
  getFinanceRequest,
  markFinanceRequestCompleted,
  getAllFinanceRequests,
  addItemRequest,
  getItemRequest,
  markItemRequestCompleted,
  getAllItemRequests,
  getItem,
  getItemsByRequest,
  addComment,
  getComment,
  getCommentsByRequestTypeId
};