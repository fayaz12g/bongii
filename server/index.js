const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config()

const app = express();
const router = express.Router();
const database = require('./database');

const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', router);

// Initialize Database
database.init();

// JWT Token Verification Middleware
const verifyToken = (req, res, next) => {
  // Get token from "Bearer <token>"
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

// ROUTES //

// Add new user
router.route('/users').post(async (req, res) => {
  const loginUser = req.body;
  try {
    let dbUser;
    if (loginUser.username) {
      dbUser = await database.getUserByUsername(loginUser.username);
    }
    if (dbUser) {
      res.status(400).json({ error: "User already exists" });
      return
    }
    // Add user to database
    const userAdded = await database.addUser(req.body);
    res.json(userAdded);
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: error });
  }
});

// Login user
router.route('/login').post(async (req, res) => {
  const loginUser = req.body;
  try {
    let dbUser;
    if (loginUser.username) {
      dbUser = await database.getUserByUsername(loginUser.username);
    }
    if (dbUser && loginUser.password && dbUser.password == loginUser.password) {
      const username = loginUser.username;
      const payload = { username };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(500).json({ error: "Invalid login information" });
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: error });
  }
});

// Get all users
router.route('/users').get(verifyToken, async (req, res) => {
  try {
    const users = await database.getAllUsers();
    res.json(users)
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: error });
  }
});

// Get all campaigns (browse)
router.route('/campaigns').get(async (req, res) => {
  try {
    const campaigns = await database.getAllCampaigns();
    res.json(campaigns)
  } catch (error) {
    console.error('Error getting all campaigns:', error);
    res.status(500).json({ error: error });
  }
});

// Get currently logged in user
router.route('/users/current').get(verifyToken, async (req, res) => {
  try {
    const user = await database.getUserByUsername(req.user.username);
    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: error });
  }
});

// Edit currently logged in user information
router.route('/users/current').put(verifyToken, async (req, res) => {
  const userInput = req.body;
  try {
    const currentUser = await database.getUserByUsername(req.user.username);

    userInput.id = currentUser.id;
    const editedUser = await database.updateUser(userInput);
    res.json(editedUser);
  } catch (error) {
    console.error('Error editing user:', error);
    res.status(500).json({ error: error });
  }
});

// Validate campaign by code
router.route('/campaigns/validate/:code').get(async (req, res) => {
  console.log("Looking for campaign: ", req.params.code)
  try {
    const campaign = await database.getCampaignByCode(req.params.code);
    if (campaign) {
      console.log("Campaign found")
      res.sendStatus(200);
    } else {
      console.log("Campaign not found")
      res.status(404).json({ error: "Campaign Not Found" });
    }
  } catch (error) {
    console.error(`Error getting campaign ${req.params.code}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Bongii Campaign Routes - Add these to your existing router

// Get campaign by code with all Bongii data
router.route('/campaigns/:code').get(async (req, res) => {
  try {
    const campaign = await database.getCampaignByCode(req.params.code);
    if (campaign) {
      res.json(campaign);
    } else {
      res.status(404).json({ error: "Campaign Not Found" });
    }
  } catch (error) {
    console.error(`Error getting campaign ${req.params.code}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create new Bongii campaign
router.route('/campaigns').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const { title, backgroundPreset, boardSize, startDateTime, categories } = req.body;
    
    const campaignData = {
      title,
      backgroundPreset: backgroundPreset || 1,
      boardSize: boardSize || 3,
      startDateTime,
      categories,
      createdBy: currentUser.id
    };
    
    const campaign = await database.createCampaign(campaignData);
    
    res.status(201).json({
      success: true,
      campaign: campaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create player board for a campaign
router.route('/campaigns/:code/board').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const campaign = await database.getCampaignByCode(req.params.code);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign Not Found" });
    }
    
    // Check if campaign has started
    if (campaign.status === 'active') {
      return res.status(400).json({ error: "Campaign has already started" });
    }
    
    const { playerName, selectedTiles } = req.body;
    
    // Create player board
    const boardData = {
      campaignId: campaign.id,
      userId: currentUser.id,
      playerName: playerName || currentUser.firstName || 'Player'
    };
    
    const board = await database.createPlayerBoard(boardData);
    
    // Add selected tiles to board
    for (const tile of selectedTiles) {
      await database.addPlayerBoardTile({
        boardId: board.id,
        categoryItemId: tile.categoryItemId,
        position: tile.position,
        isCenter: tile.isCenter || false,
        customText: tile.customText
      });
    }
    
    res.json({ 
      success: true, 
      boardCode: board.boardCode,
      message: "Board created successfully" 
    });
  } catch (error) {
    console.error('Error creating player board:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get player board by board code
router.route('/boards/:boardCode').get(async (req, res) => {
  try {
    const board = await database.getPlayerBoardByCode(req.params.boardCode);
    if (board) {
      res.json(board);
    } else {
      res.status(404).json({ error: "Board Not Found" });
    }
  } catch (error) {
    console.error(`Error getting board ${req.params.boardCode}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Update player board
router.route('/boards/:boardCode').put(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const board = await database.getPlayerBoardByCode(req.params.boardCode);
    
    if (!board) {
      return res.status(404).json({ error: "Board Not Found" });
    }
    
    // Check if user owns this board
    if (board.userId !== currentUser.id) {
      return res.status(403).json({ error: "Not authorized to edit this board" });
    }
    
    const { tiles, playerName } = req.body;
    
    // Update player name if provided
    if (playerName) {
      await database.updatePlayerBoardName(board.id, playerName);
    }
    
    // Update tiles if provided
    if (tiles && Array.isArray(tiles)) {
      for (const tile of tiles) {
        if (tile.id) {
          // Update existing tile
          await database.updatePlayerBoardTile(tile.id, tile);
        } else {
          // Add new tile
          await database.addPlayerBoardTile({
            boardId: board.id,
            ...tile
          });
        }
      }
    }
    
    res.json({ success: true, message: "Board updated successfully" });
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start campaign (moderator only)
router.route('/campaigns/:code/start').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const campaign = await database.getCampaignByCode(req.params.code);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign Not Found" });
    }
    
    // Check if user is the creator
    if (campaign.createdBy !== currentUser.id) {
      return res.status(403).json({ error: "Only campaign creator can start the game" });
    }
    
    // Update campaign status to active
    await database.updateCampaignStatus(campaign.id, 'active');
    
    res.json({ success: true, message: "Campaign started successfully" });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Call item correct/incorrect (moderator only)
router.route('/campaigns/:code/call').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const campaign = await database.getCampaignByCode(req.params.code);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign Not Found" });
    }
    
    // Check if user is the creator
    if (campaign.createdBy !== currentUser.id) {
      return res.status(403).json({ error: "Only campaign creator can call items" });
    }
    
    const { itemId, status } = req.body;
    
    if (!['correct', 'incorrect'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'correct' or 'incorrect'" });
    }
    
    await database.updateCampaignCategoryItemStatus(itemId, status);
    
    // TODO: Implement WebSocket broadcast to all connected players
    // broadcastToPlayers(campaign.id, { type: 'ITEM_CALLED', itemId, status });
    
    res.json({ success: true, message: `Item marked as ${status}` });
  } catch (error) {
    console.error('Error calling campaign item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get campaign by code
router.route('/campaigns/:code').get(async (req, res) => {
  try {
    const campaign = await database.getCampaignByCode(req.params.code);
    if (campaign) {
      // Get additional campaign data
      const players = await database.getCampaignPlayers(campaign.id);
      const sessions = await database.getCampaignSessions(campaign.id);
      const creator = await database.getUser(campaign.createdBy);
      
      // Add computed fields
      campaign.playerCount = players.length;
      campaign.sessionCount = sessions.length;
      campaign.creatorName = creator ? creator.username : 'Unknown';
      campaign.players = players;
      campaign.nextSession = sessions.length > 0 ? sessions[0].scheduledDate : null;
      
      res.json(campaign);
    } else {
      res.status(404).json({ error: "Campaign Not Found" });
    }
  } catch (error) {
    console.error(`Error getting campaign ${req.params.code}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create new campaign
router.route('/campaigns').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const { name, description, gameSystem, setting, maxPlayers, isPrivate } = req.body;
    
    // Generate unique 4-letter code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = generateCampaignCode();
      const existing = await database.getCampaignByCode(code);
      if (!existing) {
        isUnique = true;
      }
    }
    
    const campaignData = {
      code,
      name,
      description,
      gameSystem,
      setting,
      maxPlayers: maxPlayers || 6,
      isPrivate: isPrivate || false,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };
    
    const campaign = await database.createCampaign(campaignData);
    
    res.status(201).json({
      success: true,
      campaign: {
        ...campaign,
        code: code
      }
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join campaign
router.route('/campaigns/:code/join').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const campaign = await database.getCampaignByCode(req.params.code);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign Not Found" });
    }
    
    // Check if user is already in campaign
    const existingPlayer = await database.getCampaignPlayer(campaign.id, currentUser.id);
    if (existingPlayer) {
      return res.status(400).json({ error: "Already joined this campaign" });
    }
    
    // Check if campaign is full
    const players = await database.getCampaignPlayers(campaign.id);
    if (players.length >= campaign.maxPlayers) {
      return res.status(400).json({ error: "Campaign is full" });
    }
    
    const { characterName, characterClass, characterLevel } = req.body;
    
    const playerData = {
      campaignId: campaign.id,
      userId: currentUser.id,
      characterName: characterName || 'Unnamed Character',
      characterClass: characterClass || 'Unknown',
      characterLevel: characterLevel || 1,
      joinedAt: new Date().toISOString()
    };
    
    await database.addCampaignPlayer(playerData);
    
    res.json({ success: true, message: "Successfully joined campaign" });
  } catch (error) {
    console.error('Error joining campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update campaign
router.route('/campaigns/:code').put(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const campaign = await database.getCampaignByCode(req.params.code);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign Not Found" });
    }
    
    // Check if user is the creator
    if (campaign.createdBy !== currentUser.id) {
      return res.status(403).json({ error: "Only campaign creator can update" });
    }
    
    const updates = req.body;
    await database.updateCampaign(campaign.id, updates);
    
    res.json({ success: true, message: "Campaign updated successfully" });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete campaign
router.route('/campaigns/:code').delete(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const campaign = await database.getCampaignByCode(req.params.code);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign Not Found" });
    }
    
    // Check if user is the creator
    if (campaign.createdBy !== currentUser.id) {
      return res.status(403).json({ error: "Only campaign creator can delete" });
    }
    
    await database.deleteCampaign(campaign.id);
    
    res.json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's campaigns
router.route('/campaigns/user').get(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const campaigns = await database.getUserCampaigns(currentUser.id);
    
    res.json(campaigns);
  } catch (error) {
    console.error('Error getting user campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// Utility function to generate campaign codes
function generateCampaignCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Clean the database
router.route('/clean').post(async (req, res) => {
  try {
    database.clean();
    res.json({ success: "true" });
  } catch (error) {
    console.error('Error cleaning database:', error);
    res.status(500).json({ error: error });
  }
});

//////////

// Serve the app
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
