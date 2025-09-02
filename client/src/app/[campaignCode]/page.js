"use client";
import { campaignService } from "../services/campaignService";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Eye, Clock, Check, X, Trash2, Play, Shuffle, User, Trophy } from "lucide-react";
import Background from "../components/background";
import { BackgroundProvider, useBackground } from "../components/context";
import Footer from "../components/footer";
import Header from "../components/header";


export default function CampaignPage() {
  const { campaignCode } = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [campaignBoards, setCampaignBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  
  // Board state
  const [board, setBoard] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [playerName, setPlayerName] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const { setSelectedPreset } = useBackground();

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await campaignService.getCampaign(campaignCode);
        if (response.ok) {
          const data = await response.json();
          console.log(data);
          setCampaign(data);
          initializeBoard(data.boardSize);
          setSelectedPreset(data.backgroundPreset);
        } else if (response.status === 404) {
          setError("Campaign not found");
        } else {
          setError("Failed to load campaign");
        }
      } catch (err) {
        console.error("Error fetching campaign:", err);
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

   const fetchCampaignBoards = async () => {
      setLoadingBoards(true);
      try {
        const response = await campaignService.getCampaignBoards(campaignCode);
        if (response.ok) {
          const data = await response.json();
          setCampaignBoards(data);
        }
      } catch (err) {
        console.error("Error fetching campaign boards:", err);
      } finally {
        setLoadingBoards(false);
      }
    };

    if (campaignCode) {
      fetchCampaign();
      fetchCampaignBoards();
    }
  }, [campaignCode]);

  const initializeBoard = (size) => {
    const newBoard = Array(size * size).fill(null);
    // Add free space in center
    const centerIndex = Math.floor((size * size) / 2);
    newBoard[centerIndex] = { type: 'free', text: 'FREE SPACE', isCenter: true };
    setBoard(newBoard);
  };

const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

const renderMiniBoard = (boardData, boardSize) => {
    const tiles = Array(boardSize * boardSize).fill(null);
    
    if (boardData.selectedTiles) {
      boardData.selectedTiles.forEach(tile => {
        if (tile.position < tiles.length) {
          tiles[tile.position] = tile;
        }
      });
    }
  return (
        <div 
          className="grid gap-0.5 w-full h-24"
          style={{ 
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
          }}
        >
          {tiles.map((tile, index) => (
            <div
              key={index}
              className={`aspect-square border border-white/20 rounded-sm flex items-center justify-center text-[6px] ${
                tile
                  ? tile.isCenter
                    ? "bg-yellow-500/50"
                    : "bg-green-500/50"
                  : "bg-white/10"
              }`}
            >
              {tile?.isCenter && <User className="w-2 h-2" />}
              {tile && !tile.isCenter && "•"}
            </div>
          ))}
        </div>
      );
  };

  const getGoal = (boardSize) => {
    switch (boardSize) {
      case 3: return "BON";
      case 4: return "BONG";
      case 5: return "BONGI";
      default: return "BONGII";
    }
  };

 const handleCategoryItemSelect = (category, item) => {
  const categoryId = category.id;

  if (category.type === 'choose_many') {
    const currentSelected = selectedItems[categoryId] || [];
    const isSelected = currentSelected.some(selected => selected.id === item.id);

    if (isSelected) {
      // Remove from selection and board
      const newSelected = currentSelected.filter(selected => selected.id !== item.id);
      setSelectedItems({ ...selectedItems, [categoryId]: newSelected });

      const newBoard = board.map(cell =>
        cell && cell.categoryId === categoryId && cell.itemId === item.id ? null : cell
      );
      setBoard(newBoard);
    } else {
      // Add to selection and board
      const newSelected = [...currentSelected, item];
      setSelectedItems({ ...selectedItems, [categoryId]: newSelected });

      const firstEmpty = board.findIndex(cell => cell === null);
      if (firstEmpty !== -1) {
        const newBoard = [...board];
        newBoard[firstEmpty] = {
          ...item,
          categoryId: category.id,
          categoryName: category.name,
          itemId: item.id
        };
        setBoard(newBoard);
      }
    }

  } else {
    // choose_one_required or choose_one_optional
    const previousSelected = selectedItems[categoryId];

    // If clicking the same item, deselect
    if (previousSelected && previousSelected.id === item.id) {
      const newBoard = board.map(cell =>
        cell && cell.categoryId === categoryId ? null : cell
      );
      setBoard(newBoard);
      setSelectedItems({ ...selectedItems, [categoryId]: null });
      return;
    }

    // Remove all other tiles from this category
    let newBoard = board.map(cell =>
      cell && cell.categoryId === categoryId ? null : cell
    );

    // Add the new item to the first empty spot
    const firstEmpty = newBoard.findIndex(cell => cell === null);
    if (firstEmpty !== -1) {
      newBoard[firstEmpty] = {
        ...item,
        categoryId: category.id,
        categoryName: category.name,
        itemId: item.id
      };
    }

    // Update board and selectedItems in one go
    setBoard(newBoard);
    setSelectedItems({ ...selectedItems, [categoryId]: item });
  }
};

  const handleBoardCellClick = (index) => {
    // If there's a selected item from choose_many that's not on board, add it
    for (const [categoryId, items] of Object.entries(selectedItems)) {
      const category = campaign.categories.find(cat => cat.id.toString() === categoryId);
      if (category && category.type === 'choose_many') {
        const itemsArray = Array.isArray(items) ? items : [items];
        for (const item of itemsArray) {
          const isOnBoard = board.some(cell => 
            cell && cell.categoryId.toString() === categoryId && cell.itemId === item.id
          );
          if (!isOnBoard && board[index] === null) {
            const newBoard = [...board];
            newBoard[index] = {
              ...item,
              categoryId: parseInt(categoryId),
              categoryName: category.name,
              itemId: item.id
            };
            setBoard(newBoard);
            return;
          }
        }
      }
    }
  };

  const handleRemoveFromBoard = (index) => {
    if (board[index] && !board[index].isCenter) {
      const newBoard = [...board];
      newBoard[index] = null;
      setBoard(newBoard);
    }
  };

  const handleDragStart = (e, index) => {
    if (board[index]) {
      setDraggedItem({ item: board[index], fromIndex: index });
      e.dataTransfer.effectAllowed = 'move';
    }
  };


  const handleDragOver = (e, index) => {
    e.preventDefault();
    setHoveredCell(index);
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    setHoveredCell(null);

    if (draggedItem && toIndex !== draggedItem.fromIndex) {
      const newBoard = [...board];

      // Swap dragged item with target cell, even if target is null
      newBoard[toIndex] = draggedItem.item;
      newBoard[draggedItem.fromIndex] = board[toIndex] || null;

      setBoard(newBoard);
    }

    setDraggedItem(null);
  };

  const isItemSelected = (category, item) => {
    const categoryItems = selectedItems[category.id];
    if (category.type === 'choose_many') {
      return Array.isArray(categoryItems) && categoryItems.some(selected => selected.id === item.id);
    }
    return categoryItems && categoryItems.id === item.id;
  };

  const isItemOnBoard = (category, item) => {
    return board.some(cell => 
      cell && cell.categoryId === category.id && cell.itemId === item.id
    );
  };

const canFinalize = () => {
  if (!playerName.trim()) return false;

  // Check all required categories have selections
  const requiredCategories = campaign.categories.filter(cat => cat.required);
  const requiredFilled = requiredCategories.every(category => {
    const selection = selectedItems[category.id];
    return selection && (Array.isArray(selection) ? selection.length > 0 : true);
  });

  if (!requiredFilled) return false;

  // Check all board spots (except the center) are filled
  const allBoardFilled = board.every(cell => cell !== null && cell.text !== undefined);

  return allBoardFilled;
};


  const handleFinalize = async () => {
    if (!canFinalize()) return;
    
    setFinalizing(true);
    try {
      // Map the board to the format server expects
      const selectedTiles = board.map((cell, index) => {
        if (!cell) return null; // skip empty cells
        return {
          position: index,
          categoryItemId: cell.itemId || null,  // link to category item if exists
          isCenter: cell.isCenter || false,
          customText: cell.text || null          // e.g., free space text or any custom text
        };
      }).filter(Boolean); // remove nulls for empty cells

      const boardData = {
        campaignCode,
        playerName: playerName.trim(),
        selectedTiles
      };

      const response = await campaignService.createPlayerBoard(boardData);

      if (response.ok) {
        const data = await response.json();
        router.push(`/boards/${data.boardCode}`);
      } else {
        alert("Error creating board. Please try again.");
      }
    } catch (error) {
      console.error("Error finalizing board:", error);
      alert("Error creating board. Please try again.");
    } finally {
      setFinalizing(false);
    }
  };


  const updatePlayerName = (index, name) => {
    const newBoard = [...board];
    if (newBoard[index] && newBoard[index].isCenter) {
      newBoard[index] = { ...newBoard[index], text: name || 'FREE SPACE' };
      setBoard(newBoard);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-red-400/30">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Error</h1>
            <p className="text-white mb-6">{error}</p>
            <button
              onClick={() => router.push("/browse")}
              className="flex items-center justify-center mx-auto text-white bg-red-500/20 hover:bg-red-500/30 px-6 py-3 rounded-xl border-2 border-red-400 hover:border-red-300 transition-all"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen`}>
      <Header />
      <br /> <br /> <br />
      <Background />
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push("/browse")}
            className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-1">{campaign.title}</h1>
            <p className="text-white/70">Code: {campaignCode}</p>
          </div>
          
          <div className="text-right text-white">
            <div className="flex items-center justify-end mb-1">
              <Trophy className="w-4 h-4 mr-1" />
              <span className="text-sm">Goal: {getGoal(campaign.boardSize)}</span>
            </div>
            <div className="flex items-center justify-end">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-sm">{campaign.playerCount || 0} players</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-6 gap-8">
          {/* Categories Panel */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-6 border-2 border-white/20 shadow-2xl sticky top-8">
              <h2 className="text-xl font-bold text-white mb-4">Categories</h2>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {campaign.categories.map((category) => (
                  <div 
                    key={category.id} 
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 shadow-md"
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-sm flex items-center">
                        {category.name}
                        {category.required && (
                          <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </h3>
                    </div>
                    <p className="text-gray-400 text-xs">
                      {category.type === "choose_many" ? "Select multiple" : "Select one"}
                    </p>

                    {/* Category Items → Tile Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {category.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleCategoryItemSelect(category, item)}
                          className={`aspect-square flex items-center justify-center text-center rounded-xl border-2 text-xs font-medium transition-all
                            ${
                              isItemSelected(category, item)
                                ? isItemOnBoard(category, item)
                                  ? "bg-green-500/30 border-green-400 text-green-100"
                                  : "bg-blue-500/30 border-blue-400 text-blue-100"
                                : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                            }`}
                        >
                          <span className="px-1 line-clamp-2">{item.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
              {/* Player Name Input */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-2">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border-2 border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Board */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Your Bongii Board</h2>
                <div 
                  className={`grid gap-2 mx-auto`}
                  style={{ 
                    gridTemplateColumns: `repeat(${campaign.boardSize}, 1fr)`,
                    maxWidth: `${campaign.boardSize * 120}px`
                  }}
                >
                  {board.map((cell, index) => (
                    <div
                      key={index}
                      className={`aspect-square border-2 rounded-xl flex items-center justify-center p-2 text-center cursor-pointer transition-all ${
                        cell
                          ? cell.isCenter
                            ? "bg-yellow-500/30 border-yellow-400 text-yellow-100"
                            : "bg-green-500/30 border-green-400 text-green-100 hover:bg-green-500/40"
                          : hoveredCell === index
                            ? "bg-blue-500/30 border-blue-400"
                            : "bg-white/10 border-white/30 hover:bg-white/20"
                      }`}
                      onClick={() => cell ? null : handleBoardCellClick(index)}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      draggable={!!cell}
                    >
                      {cell ? (
                        <div className="relative w-full h-full flex items-center justify-center group">
                          {cell.isCenter ? (
                            <div className="text-center">
                              <User className="w-6 h-6 mx-auto mb-1" />
                              <input
                                type="text"
                                value={playerName}
                                onChange={(e) => {
                                  setPlayerName(e.target.value);
                                  updatePlayerName(index, e.target.value);
                                }}
                                placeholder="Your Name"
                                className="bg-transparent text-center text-xs w-full text-yellow-100 placeholder-yellow-200/50"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-medium break-words">{cell.text || cell.name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromBoard(index);
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-white/50 text-xs">Empty</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white/10 rounded-xl p-4 mb-6">
                <h3 className="text-white font-semibold mb-2">Instructions:</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Select items from categories on the left</li>
                  <li>• Items will automatically fill empty board spaces</li>
                  <li>• Drag and drop items to rearrange them (you can even move the free space!)</li>
                  <li>• Click the ✕ on items to remove them</li>
                  <li>• Fill required categories before finalizing</li>
                </ul>
              </div>

              {/* Finalize Button */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: canFinalize() ? 1.05 : 1 }}
                  whileTap={{ scale: canFinalize() ? 0.97 : 1 }}
                  onClick={handleFinalize}
                  disabled={!canFinalize() || finalizing}
                  className={`px-8 py-4 rounded-xl font-semibold border-2 transition-all ${
                    canFinalize()
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white border-white/30 hover:border-white/50"
                      : "bg-gray-500/30 text-gray-300 border-gray-500/30 cursor-not-allowed"
                  }`}
                >
                  {finalizing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                      Creating Board...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Play className="w-5 h-5 mr-2" />
                      Finalize Board
                    </div>
                  )}
                </motion.button>
              </div>

              {!canFinalize() && (
                <div className="text-center mt-4">
                  <p className="text-yellow-300 text-sm">
                    {!playerName.trim() && "Enter your name and "}
                    Complete all required categories to finalize your board
                  </p>
                </div>
              )}
            </div>
          </div>
         {/* Existing Boards Panel */}
          <div className="lg:col-span-1">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-6 border-2 border-white/20 shadow-2xl sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Player Boards</h2>
                <div className="flex items-center text-white/70">
                  <Eye className="w-4 h-4 mr-1" />
                  <span className="text-sm">{campaignBoards.length}</span>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-3">
                {loadingBoards ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white mx-auto mb-2"></div>
                    <p className="text-white/70 text-sm">Loading boards...</p>
                  </div>
                ) : campaignBoards.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-white/30 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">No boards created yet</p>
                    <p className="text-white/50 text-xs mt-1">Be the first to play!</p>
                  </div>
                ) : (
                  campaignBoards.map((boardData) => (
                    <motion.div
                      key={boardData.boardCode}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/10 hover:bg-white/15 rounded-xl p-4 border border-white/20 hover:border-white/30 cursor-pointer transition-all"
                      onClick={() => router.push(`/boards/${boardData.boardCode}`)}
                    >
                      <div className="mb-3">
                        {renderMiniBoard(boardData, campaign.boardSize)}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-medium text-sm truncate">
                            {boardData.playerName || 'Anonymous'}
                          </h4>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="bg-blue-500/20 hover:bg-blue-500/30 rounded-full p-1"
                          >
                            <Eye className="w-3 h-3 text-blue-300" />
                          </motion.div>
                        </div>
                        
                        <div className="flex items-center text-white/50 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{formatTimeAgo(boardData.createdAt)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {campaignBoards.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-white/50 text-xs text-center">
                    Click any board to view it
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
          </div>
        <Footer />
    </div>
  );
}