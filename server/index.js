const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config()

const app = express();
const router = express.Router();
const database = require('./database');

const PORT = 3000;

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

// Add new time request
router.route('/requests/time').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    // Add time request to database
    const timeRequestAdded = await database.addTimeRequest(currentUser.id, req.body);
    res.json(timeRequestAdded);
  } catch (error) {
    console.error('Error adding time request:', error);
    res.status(500).json({ error: error });
  }
});

// Get time request by id
router.route('/requests/time/:id').get(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const request = await database.getTimeRequest(req.params.id);
    if (request) {
      let comments = await database.getCommentsByRequestTypeId("time", req.params.id);
      console.log("Found comments in request: " + comments);
      for (let comment of comments) {
        const user = await database.getUser(comment.userId);
        console.log("user to expand: " + JSON.stringify(user));
        comment.firstName = user.firstName;
        comment.lastName = user.lastName;
        comment.username = user.username;
        comment.profileIcon = user.profileIcon;
        console.log("Comment with correct fields: " + JSON.stringify(comment));
      }
      request.comments = comments;
      request.owner = (currentUser.id == request.owner);
      res.json(request);
    } else {
      res.status(404).json({ error: "Time Request Not Found" });
    }
  } catch (error) {
    console.error(`Error getting time request ${req.params.id}:`, error);
    res.status(500).json({ error: error });
  }
});

// Mark time request completed
router.route('/requests/time/:id/complete').put(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const request = await database.getTimeRequest(req.params.id);
    if (currentUser.id == request.owner) {
      const completedRequest = await database.markTimeRequestCompleted(req.params.id);
      res.json(completedRequest);
    } else {
      res.status(403).json({ error: "Current user does not have permission to complete this request" });
    }
  } catch (error) {
    console.error('Error editing user:', error);
    res.status(500).json({ error: error });
  }
});

// Get all time requests
router.route('/requests/time').get(verifyToken, async (req, res) => {
  try {
    const timeRequests = await database.getAllTimeRequests();
    for (const timeRequest of timeRequests) {
      timeRequest.timeSlots = await database.getTimeSlotsByRequest(timeRequest.id);
      console.log("timeSlots: " + JSON.stringify(timeRequest.timeSlots));
    }
    res.json(timeRequests)
  } catch (error) {
    console.error('Error getting all time requests:', error);
    res.status(500).json({ error: error });
  }
});

// Add new finance request
router.route('/requests/finance').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    // Add finance request to database
    const financeRequestAdded = await database.addFinanceRequest(currentUser.id, req.body);
    res.json(financeRequestAdded);
  } catch (error) {
    console.error('Error adding finance request:', error);
    res.status(500).json({ error: error });
  }
});

// Get finance request by id
router.route('/requests/finance/:id').get(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const request = await database.getFinanceRequest(req.params.id);
    if (request) {
      let comments = await database.getCommentsByRequestTypeId("finance", req.params.id);
      console.log("Found comments in request: " + comments);
      for (let comment of comments) {
        const user = await database.getUser(comment.userId);
        console.log("user to expand: " + JSON.stringify(user));
        comment.firstName = user.firstName;
        comment.lastName = user.lastName;
        comment.username = user.username;
        comment.profileIcon = user.profileIcon;
        console.log("Comment with correct fields: " + JSON.stringify(comment));
      }
      request.comments = comments;
      request.owner = (currentUser.id == request.owner);
      res.json(request);
    } else {
      res.status(404).json({ error: "Finance Request Not Found" });
    }
  } catch (error) {
    console.error(`Error getting finance request ${req.params.id}:`, error);
    res.status(500).json({ error: error });
  }
});

// Mark finance request completed
router.route('/requests/finance/:id/complete').put(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const request = await database.getFinanceRequest(req.params.id);
    if (currentUser.id == request.owner) {
      const completedRequest = await database.markFinanceRequestCompleted(req.params.id);
      res.json(completedRequest);
    } else {
      res.status(403).json({ error: "Current user does not have permission to complete this request" });
    }
  } catch (error) {
    console.error('Error editing user:', error);
    res.status(500).json({ error: error });
  }
});

// Get all finance requests
router.route('/requests/finance').get(verifyToken, async (req, res) => {
  try {
    const financeRequests = await database.getAllFinanceRequests();
    res.json(financeRequests)
  } catch (error) {
    console.error('Error getting all finance requests:', error);
    res.status(500).json({ error: error });
  }
});

// Add new item request
router.route('/requests/item').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    // Add item request to database
    const itemRequestAdded = await database.addItemRequest(currentUser.id, req.body);
    res.json(itemRequestAdded);
  } catch (error) {
    console.error('Error adding item request:', error);
    res.status(500).json({ error: error });
  }
});

// Get item request by id
router.route('/requests/item/:id').get(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const request = await database.getItemRequest(req.params.id);
    if (request) {
      let comments = await database.getCommentsByRequestTypeId("item", req.params.id);
      console.log("Found comments in request: " + comments);
      for (let comment of comments) {
        const user = await database.getUser(comment.userId);
        console.log("user to expand: " + JSON.stringify(user));
        comment.firstName = user.firstName;
        comment.lastName = user.lastName;
        comment.username = user.username;
        comment.profileIcon = user.profileIcon;
        console.log("Comment with correct fields: " + JSON.stringify(comment));
      }
      request.comments = comments;
      request.owner = (currentUser.id == request.owner);
      res.json(request);
    } else {
      res.status(404).json({ error: "Item Request Not Found" });
    }
  } catch (error) {
    console.error(`Error getting item request ${req.params.id}:`, error);
    res.status(500).json({ error: error });
  }
});

// Get all item requests
router.route('/requests/item').get(verifyToken, async (req, res) => {
  try {
    const itemRequests = await database.getAllItemRequests();
    for (const itemRequest of itemRequests) {
      itemRequest.items = await database.getItemsByRequest(itemRequest.id);
      console.log("items: " + JSON.stringify(itemRequest.items));
    }
    res.json(itemRequests);
  } catch (error) {
    console.error('Error getting all item requests:', error);
    res.status(500).json({ error: error });
  }
});

// Mark item request completed
router.route('/requests/item/:id/complete').put(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    const request = await database.getItemRequest(req.params.id);
    if (currentUser.id == request.owner) {
      const completedRequest = await database.markItemRequestCompleted(req.params.id);
      res.json(completedRequest);
    } else {
      res.status(403).json({ error: "Current user does not have permission to complete this request" });
    }
  } catch (error) {
    console.error('Error editing user:', error);
    res.status(500).json({ error: error });
  }
});

// Add new comment
router.route('/comments/:type').post(verifyToken, async (req, res) => {
  try {
    const currentUser = await database.getUserByUsername(req.user.username);
    // Add comment to database
    const type = req.params.type;
    const commentAdded = await database.addComment(type, currentUser.id, req.body);
    res.json(commentAdded);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error });
  }
});

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
