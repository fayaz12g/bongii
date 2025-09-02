const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

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

  // Create a "campaigns" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      backgroundPreset INTEGER DEFAULT 1,
      boardSize INTEGER DEFAULT 3, -- 3x3, 4x4, 5x5
      startDateTime TEXT NOT NULL,
      status TEXT DEFAULT 'waiting', -- waiting, active, completed
      createdBy INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      isActive BOOLEAN DEFAULT 1,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error("Error creating campaigns table:", err);
    } else {
      console.log("Campaigns table created or already exists");
    }
  });

  // update campaigns table to include description
  db.run("ALTER TABLE campaigns ADD COLUMN description TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Migration error:", err.message);
    } else {
      console.log("Column 'description' ensured.");
    }
  });

  // Create a "campaignCategories" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS campaignCategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- choose_many, choose_one_required, choose_one_optional
      required BOOLEAN DEFAULT 0,
      orderIndex INTEGER DEFAULT 0,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id)
    )
  `, (err) => {
    if (err) {
      console.error("Error creating campaignCategories table:", err);
    } else {
      console.log("CampaignCategories table created or already exists");
    }
  });

  // Create a "campaignCategoryItems" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS campaignCategoryItems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryId INTEGER NOT NULL,
      text TEXT NOT NULL,
      orderIndex INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending', -- pending, correct, incorrect
      calledAt TEXT NULL,
      FOREIGN KEY (categoryId) REFERENCES campaignCategories(id)
    )
  `, (err) => {
    if (err) {
      console.error("Error creating campaignCategoryItems table:", err);
    } else {
      console.log("CampaignCategoryItems table created or already exists");
    }
  });

  // Create a "playerBoards" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS playerBoards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL,
      userId INTEGER,  -- now nullable for anonymous boards
      playerName TEXT,
      boardCode TEXT UNIQUE NOT NULL, -- unique URL code for this board
      createdAt TEXT NOT NULL,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id),
      FOREIGN KEY (userId) REFERENCES users(id)
      -- removed UNIQUE(campaignId, userId) because anonymous boards don't need it
    )
  `, (err) => {
    if (err) {
      console.error("Error creating playerBoards table:", err);
    } else {
      console.log("PlayerBoards table created or already exists");
    }
  });


  // Create a "playerBoardTiles" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS playerBoardTiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boardId INTEGER NOT NULL,
      categoryItemId INTEGER,
      position INTEGER NOT NULL, -- 0-8 for 3x3, 0-15 for 4x4, 0-24 for 5x5
      isCenter BOOLEAN DEFAULT 0, -- true for the free center space
      customText TEXT NULL, -- for when players enter their name in center
      FOREIGN KEY (boardId) REFERENCES playerBoards(id),
      FOREIGN KEY (categoryItemId) REFERENCES campaignCategoryItems(id),
      UNIQUE(boardId, position)
    )
  `, (err) => {
    if (err) {
      console.error("Error creating playerBoardTiles table:", err);
    } else {
      console.log("PlayerBoardTiles table created or already exists");
    }
  });

  // Create a "campaignSessions" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS campaignSessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaignId INTEGER NOT NULL,
      startedAt TEXT,
      completedAt TEXT,
      winnerBoardId INTEGER NULL,
      status TEXT DEFAULT 'scheduled', -- scheduled, active, completed
      FOREIGN KEY (campaignId) REFERENCES campaigns(id),
      FOREIGN KEY (winnerBoardId) REFERENCES playerBoards(id)
    )
  `, (err) => {
    if (err) {
      console.error("Error creating campaignSessions table:", err);
    } else {
      console.log("CampaignSessions table created or already exists");
    }
  });

  // Create a "backgroundPresets" table, if it does not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS backgroundPresets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gradient TEXT NOT NULL,
      animation TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error("Error creating backgroundPresets table:", err);
    } else {
      console.log("BackgroundPresets table created or already exists");
    }
  });

    // Do some extra logic
  db.run(`
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_campaigns_code ON campaigns(code);
      CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(createdBy);
      CREATE INDEX IF NOT EXISTS idx_campaign_categories_campaign ON campaignCategories(campaignId);
      CREATE INDEX IF NOT EXISTS idx_campaign_category_items_category ON campaignCategoryItems(categoryId);
      CREATE INDEX IF NOT EXISTS idx_player_boards_campaign ON playerBoards(campaignId);
      CREATE INDEX IF NOT EXISTS idx_player_boards_user ON playerBoards(userId);
      CREATE INDEX IF NOT EXISTS idx_player_boards_code ON playerBoards(boardCode);
      CREATE INDEX IF NOT EXISTS idx_player_board_tiles_board ON playerBoardTiles(boardId);

      -- Insert background presets
      INSERT OR IGNORE INTO backgroundPresets (id, name, gradient, animation) VALUES 
        (1, 'Ocean Waves', 'from-blue-400 via-blue-600 to-purple-700', 'wave'),
        (2, 'Sunset Glow', 'from-orange-400 via-pink-500 to-purple-600', 'glow'),
        (3, 'Forest Mystery', 'from-green-400 via-teal-500 to-blue-600', 'float'),
        (4, 'Cherry Blossom', 'from-pink-300 via-purple-400 to-indigo-500', 'drift'),
        (5, 'Golden Hour', 'from-yellow-400 via-orange-500 to-red-600', 'pulse'),
        (6, 'Arctic Aurora', 'from-cyan-300 via-blue-400 to-indigo-600', 'shimmer');
  `, (err) => {
    if (err) {
      console.error("Error doing extra logic:", err);
    } else {
      console.log("Extra logic created successfully or already exists");
    }
  });
};

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

// Get all users
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

// Get all campaigns with full related data
const getAllCampaigns = () => {
  console.log('Getting all campaigns');

  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM campaigns WHERE isActive = 1', async (err, campaigns) => {
      if (err) {
        console.error('Error getting all campaigns:', err);
        return reject(err);
      }

      try {
        // Map each campaign to a Promise that fetches its full data
        const campaignsWithDetails = await Promise.all(
          campaigns.map(async (campaign) => {
            // Get background preset
            const preset = await getBackgroundPreset(campaign.backgroundPreset);

            // Get categories
            const categories = await getCampaignCategories(campaign.id);

            // Get player count
            const playerCount = await getCampaignPlayerCount(campaign.id);

            return {
              ...campaign,
              backgroundPreset: preset,
              categories,
              playerCount,
            };
          })
        );

        console.log('Found campaigns with details:', campaignsWithDetails);
        resolve(campaignsWithDetails);
      } catch (error) {
        console.error('Error assembling full campaign data:', error);
        reject(error);
      }
    });
  });
};

// Get all boards with full related data
const getAllBoards = () => {
  console.log("Getting all boards");

  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM playerBoards", async (err, boards) => {
      if (err) {
        console.error("Error getting all boards:", err);
        return reject(err);
      }

      try {
        const boardsWithDetails = await Promise.all(
          boards.map(async (board) => {
            // Get campaign info
            const campaign = await new Promise((res, rej) => {
              db.get("SELECT * FROM campaigns WHERE id = ?", [board.campaignId], (err, row) => {
                if (err) return rej(err);
                res(row);
              });
            });

            // Get background preset for the campaign
            const preset = campaign?.backgroundPreset
              ? await getBackgroundPreset(campaign.backgroundPreset)
              : null;

            // Get player count for the campaign
            const playerCount = await getCampaignPlayerCount(board.campaignId);

            return {
              ...board,
              campaignTitle: campaign?.title || "Unknown Campaign",
              campaignBoardSize: campaign?.boardSize,
              backgroundPreset: preset,
              playerCount,
            };
          })
        );

        console.log("Found boards with details:", boardsWithDetails);
        resolve(boardsWithDetails);
      } catch (error) {
        console.error("Error assembling full board data:", error);
        reject(error);
      }
    });
  });
};

// Get campaign boards with full related data
const getCampaignBoards = (campaignCode) => {
  console.log("Getting all boards for campaign code:", campaignCode);

  return new Promise((resolve, reject) => {
    // Step 1: find campaign by code
    db.get("SELECT * FROM campaigns WHERE code = ?", [campaignCode], async (err, campaign) => {
      if (err) {
        console.error("Error finding campaign by code:", err);
        return reject(err);
      }
      if (!campaign) {
        return reject(new Error("Campaign not found"));
      }

      try {
        // Step 2: get all boards for this campaign id
        db.all("SELECT * FROM playerBoards WHERE campaignId = ?", [campaign.id], async (err, boards) => {
          if (err) {
            console.error("Error getting boards:", err);
            return reject(err);
          }

          // Step 3: load campaign details (you already have them here)
          const preset = campaign?.backgroundPreset
            ? await getBackgroundPreset(campaign.backgroundPreset)
            : null;

          const playerCount = await getCampaignPlayerCount(campaign.id);

          const boardsWithDetails = boards.map((board) => ({
            ...board,
            campaignTitle: campaign?.title || "Unknown Campaign",
            campaignBoardSize: campaign?.boardSize,
            backgroundPreset: preset,
            playerCount,
          }));

          console.log("Found boards with details:", boardsWithDetails);
          resolve(boardsWithDetails);
        });
      } catch (error) {
        console.error("Error assembling full board data:", error);
        reject(error);
      }
    });
  });
};

// Get a campaign by code with all related data
const getCampaignByCode = (code) => {
  console.log('Getting campaign with code:', code);

  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM campaigns WHERE code = ? AND isActive = 1', [code], async (err, campaign) => {
      if (err) return reject(err);
      if (!campaign) return resolve(null);

      try {
        // Get categories and their items
        const categories = await getCampaignCategories(campaign.id);

        // Get background preset by id
        const preset = await getBackgroundPreset(campaign.backgroundPreset);

        // Get player count
        const playerCount = await getCampaignPlayerCount(campaign.id);

        campaign.categories = categories;
        campaign.backgroundPreset = preset; // full preset object
        campaign.playerCount = playerCount;

        resolve(campaign);
      } catch (error) {
        reject(error);
      }
    });
  });
};


// Create a new campaign
const createCampaign = async (campaignData) => {
  console.log('Creating campaign:', campaignData);

  const { title, backgroundPreset, boardSize, startDateTime, categories, createdBy } = campaignData;

  try {
    // Save the background preset and get the full object
    const savedPreset = await saveBackgroundPreset(backgroundPreset);

    const code = generateCode();
    const createdAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO campaigns (code, title, backgroundPreset, boardSize, startDateTime, createdBy, createdAt, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [code, title, savedPreset.id, boardSize, startDateTime, createdBy, createdAt],
        async function(err) {
          if (err) {
            console.error('Error creating campaign:', err);
            return reject(err);
          }

          const campaignId = this.lastID;

          try {
            // Insert categories and items
            for (let i = 0; i < categories.length; i++) {
              const category = categories[i];
              await createCampaignCategory(campaignId, category, i);
            }

            resolve({
              id: campaignId,
              code,
              title,
              backgroundPreset: savedPreset,
              boardSize,
              startDateTime,
              createdBy,
              createdAt
            });
          } catch (categoryError) {
            reject(categoryError);
          }
        }
      );
    });
  } catch (presetError) {
    console.error('Error saving background preset:', presetError);
    throw presetError;
  }
};


// Create campaign category
const createCampaignCategory = (campaignId, categoryData, orderIndex) => {
  return new Promise((resolve, reject) => {
    const { name, type, required, items } = categoryData;
    
    db.run(
      `INSERT INTO campaignCategories (campaignId, name, type, required, orderIndex) 
       VALUES (?, ?, ?, ?, ?)`,
      [campaignId, name, type, required, orderIndex],
      async function(err) {
        if (err) {
          console.error('Error creating campaign category:', err);
          reject(err);
        } else {
          const categoryId = this.lastID;
          
          try {
            // Add category items
            for (let i = 0; i < items.length; i++) {
              await createCampaignCategoryItem(categoryId, items[i], i);
            }
            
            resolve({
              id: categoryId,
              campaignId,
              name,
              type,
              required,
              orderIndex
            });
          } catch (itemError) {
            reject(itemError);
          }
        }
      }
    );
  });
};

// Create campaign category item
const createCampaignCategoryItem = (categoryId, text, orderIndex) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO campaignCategoryItems (categoryId, text, orderIndex) 
       VALUES (?, ?, ?)`,
      [categoryId, text, orderIndex],
      function(err) {
        if (err) {
          console.error('Error creating campaign category item:', err);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            categoryId,
            text,
            orderIndex
          });
        }
      }
    );
  });
};

// Save a background preset and return its id
const saveBackgroundPreset = (preset) => {
  return new Promise((resolve, reject) => {
    // If id is 'custom', let SQLite auto-increment it
    if (preset.id === 'custom') {
      db.run(
        `INSERT INTO backgroundPresets (name, gradient, animation) VALUES (?, ?, ?)`,
        [preset.name, preset.gradient, preset.animation],
        function(err) {
          if (err) {
            console.error('Error saving background preset:', err);
            reject(err);
          } else {
            // Return the full preset with the new numeric id
            resolve({ ...preset, id: this.lastID });
          }
        }
      );
    } else {
      // If preset.id is numeric, insert it manually
      db.run(
        `INSERT INTO backgroundPresets (id, name, gradient, animation) VALUES (?, ?, ?, ?)`,
        [preset.id, preset.name, preset.gradient, preset.animation],
        function(err) {
          if (err) {
            console.error('Error saving background preset:', err);
            reject(err);
          } else {
            resolve(preset);
          }
        }
      );
    }
  });
};


// Get campaign categories with items
const getCampaignCategories = (campaignId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM campaignCategories WHERE campaignId = ? ORDER BY orderIndex',
      [campaignId],
      async (err, categories) => {
        if (err) {
          console.error('Error getting campaign categories:', err);
          reject(err);
        } else {
          try {
            // Get items for each category
            const categoriesWithItems = await Promise.all(
              categories.map(async (category) => {
                const items = await getCampaignCategoryItems(category.id);
                return { ...category, items };
              })
            );
            resolve(categoriesWithItems);
          } catch (itemError) {
            reject(itemError);
          }
        }
      }
    );
  });
};

// Get campaign category items
const getCampaignCategoryItems = (categoryId) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM campaignCategoryItems WHERE categoryId = ? ORDER BY orderIndex',
      [categoryId],
      (err, items) => {
        if (err) {
          console.error('Error getting campaign category items:', err);
          reject(err);
        } else {
          resolve(items || []);
        }
      }
    );
  });
};

// Get background preset
const getBackgroundPreset = (presetId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM backgroundPresets WHERE id = ?', [presetId], (err, preset) => {
      if (err) {
        console.error('Error getting background preset:', err);
        reject(err);
      } else {
        resolve(preset);
      }
    });
  });
};

// Generate unique 4-letter code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};


// Create anonymous player board
const createPlayerBoard = (boardData) => {
  console.log('Creating player board:', boardData);
  return new Promise((resolve, reject) => {
    const { campaignId, playerName } = boardData;

    const boardCode = generateCode();
    const createdAt = new Date().toISOString();

    db.run(
      `INSERT INTO playerBoards (campaignId, playerName, boardCode, createdAt) 
       VALUES (?, ?, ?, ?)`,
      [campaignId, playerName, boardCode, createdAt],
      function(err) {
        if (err) {
          console.error('Error creating player board:', err);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            campaignId,
            playerName,
            boardCode,
            createdAt
          });
        }
      }
    );
  });
};

// Get player board by code
const getPlayerBoardByCode = (boardCode) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT pb.*, c.title as campaignTitle, c.boardSize, c.backgroundPreset as presetId, c.startDateTime, c.status as campaignStatus
       FROM playerBoards pb 
       JOIN campaigns c ON pb.campaignId = c.id 
       WHERE pb.boardCode = ?`,
      [boardCode],
      async (err, board) => {
        if (err) {
          console.error("Error getting player board by code:", err);
          return reject(err);
        }

        if (!board) return resolve(null);

        try {
          // Get board tiles
          const tiles = await getPlayerBoardTiles(board.id);
          board.tiles = tiles;

          // Get full backgroundPreset object
          if (board.presetId) {
            db.get(
              `SELECT id, name, gradient, animation FROM backgroundPresets WHERE id = ?`,
              [board.presetId],
              (err, preset) => {
                if (err) {
                  console.error("Error fetching background preset:", err);
                  return reject(err);
                }

                board.backgroundPreset = preset || null;
                resolve(board);
              }
            );
          } else {
            board.backgroundPreset = null;
            resolve(board);
          }
        } catch (tileError) {
          reject(tileError);
        }
      }
    );
  });
};



// Add player board tile
const addPlayerBoardTile = (tileData) => {
  return new Promise((resolve, reject) => {
    const { boardId, categoryItemId, position, isCenter, customText } = tileData;
    
    db.run(
      `INSERT INTO playerBoardTiles (boardId, categoryItemId, position, isCenter, customText) 
       VALUES (?, ?, ?, ?, ?)`,
      [boardId, categoryItemId, position, isCenter, customText],
      function(err) {
        if (err) {
          console.error('Error adding player board tile:', err);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            ...tileData
          });
        }
      }
    );
  });
};

// Get player board tiles
const getPlayerBoardTiles = (boardId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT pbt.*, cci.text, cci.status as itemStatus, cc.name as categoryName, cc.type as categoryType
       FROM playerBoardTiles pbt
       LEFT JOIN campaignCategoryItems cci ON pbt.categoryItemId = cci.id
       LEFT JOIN campaignCategories cc ON cci.categoryId = cc.id
       WHERE pbt.boardId = ?
       ORDER BY pbt.position`,
      [boardId],
      (err, tiles) => {
        if (err) {
          console.error('Error getting player board tiles:', err);
          reject(err);
        } else {
          resolve(tiles || []);
        }
      }
    );
  });
};

// Get campaign player count
const getCampaignPlayerCount = (campaignId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM playerBoards WHERE campaignId = ?',
      [campaignId],
      (err, result) => {
        if (err) {
          console.error('Error getting campaign player count:', err);
          reject(err);
        } else {
          resolve(result ? result.count : 0);
        }
      }
    );
  });
};

// Update campaign category item status (for moderator)
const updateCampaignCategoryItemStatus = (itemId, status) => {
  return new Promise((resolve, reject) => {
    const calledAt = new Date().toISOString();
    
    db.run(
      'UPDATE campaignCategoryItems SET status = ?, calledAt = ? WHERE id = ?',
      [status, calledAt, itemId],
      function(err) {
        if (err) {
          console.error('Error updating category item status:', err);
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
};

// Get user's campaigns (created campaigns only for Bongii)
const getUserCampaigns = (userId) => {
  console.log('Getting campaigns for user:', userId);

  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM campaigns WHERE createdBy = ? AND isActive = 1 ORDER BY createdAt DESC', [userId], async (err, campaigns) => {
      if (err) return reject(err);
      if (!campaigns || campaigns.length === 0) return resolve([]);

      try {
        const enrichedCampaigns = await Promise.all(
          campaigns.map(async (campaign) => {
            // Get categories and items
            const categories = await getCampaignCategories(campaign.id);

            // Get full background preset object
            const preset = await getBackgroundPreset(campaign.backgroundPreset);

            // Get player count
            const playerCount = await getCampaignPlayerCount(campaign.id);

            return {
              ...campaign,
              categories,
              backgroundPreset: preset, // full object with id, name, gradient, animation
              playerCount
            };
          })
        );

        resolve(enrichedCampaigns);
      } catch (error) {
        reject(error);
      }
    });
  });
};


// Delete a campaign by id
const deleteCampaign = (campaignId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM campaigns WHERE id = ?`,
      [campaignId],
      function (err) {
        if (err) {
          console.error('Error deleting campaign:', err);
          reject(err);
        } else {
          resolve({ changes: this.changes }); // this.changes = rows affected
        }
      }
    );
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
  getAllCampaigns,
  createCampaign,
  getCampaignByCode,
  getUserCampaigns,
  updateCampaignCategoryItemStatus,
  getCampaignPlayerCount,
  createCampaignCategory,
  createCampaignCategoryItem,
  getCampaignCategories,
  getCampaignCategoryItems,
  getBackgroundPreset,
  createPlayerBoard,
  getPlayerBoardByCode,
  addPlayerBoardTile,
  getPlayerBoardTiles,
  deleteCampaign,
  getAllBoards,
  getCampaignBoards,
};