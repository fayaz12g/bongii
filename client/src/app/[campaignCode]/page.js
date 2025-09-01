"use client";
import { campaignService } from "../services/campaignService";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Calendar, MapPin, Check, X, Trash2, Play, Shuffle, User, Trophy } from "lucide-react";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";

// Background presets (should match your create screen)
const backgroundPresets = [
  { id: 1, name: "Ocean Waves", gradient: "from-blue-400 via-blue-600 to-purple-700", animation: "wave" },
  { id: 2, name: "Sunset Glow", gradient: "from-orange-400 via-pink-500 to-purple-600", animation: "glow" },
  { id: 3, name: "Forest Mystery", gradient: "from-green-400 via-teal-500 to-blue-600", animation: "float" },
  { id: 4, name: "Cherry Blossom", gradient: "from-pink-300 via-purple-400 to-indigo-500", animation: "drift" },
  { id: 5, name: "Golden Hour", gradient: "from-yellow-400 via-orange-500 to-red-600", animation: "pulse" },
  { id: 6, name: "Arctic Aurora", gradient: "from-cyan-300 via-blue-400 to-indigo-600", animation: "shimmer" },
];

export default function CampaignPage() {
  const { campaignCode } = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  
  // Board state
  const [board, setBoard] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [playerName, setPlayerName] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await campaignService.getCampaign(campaignCode);
        if (response.ok) {
          const data = await response.json();
          setCampaign(data);
          initializeBoard(data.boardSize);
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

    if (campaignCode) {
      fetchCampaign();
    }
  }, [campaignCode]);

  const initializeBoard = (size) => {
    const newBoard = Array(size * size).fill(null);
    // Add free space in center
    const centerIndex = Math.floor((size * size) / 2);
    newBoard[centerIndex] = { type: 'free', text: 'FREE SPACE', isCenter: true };
    setBoard(newBoard);
  };

  const getCurrentPreset = () => {
    return backgroundPresets.find(preset => preset.id === campaign?.backgroundPreset?.id) || backgroundPresets[0];
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
        router.push(`/board/${data.boardCode}`);
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
              onClick={() => router.push("/")}
              className="flex items-center justify-center mx-auto text-white bg-red-500/20 hover:bg-red-500/30 px-6 py-3 rounded-xl border-2 border-red-400 hover:border-red-300 transition-all"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPreset = getCurrentPreset();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentPreset.gradient}`}>
      <BackgroundProvider>
          <Background preset={currentPreset} />
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Home</span>
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Categories Panel */}
          <div className="lg:col-span-1">
            <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-6 border-2 border-white/20 shadow-2xl sticky top-8">
              <h2 className="text-xl font-bold text-white mb-4">Categories</h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {campaign.categories.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <h3 className="text-white font-semibold text-sm flex items-center">
                      {category.name}
                      {category.required && (
                        <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">Required</span>
                      )}
                    </h3>
                    <p className="text-gray-300 text-xs">
                      {category.type === 'choose_many' ? 'Select multiple' : 'Select one'}
                    </p>
                    
                    <div className="space-y-1">
                      {category.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleCategoryItemSelect(category, item)}
                          className={`w-full p-2 rounded-lg border-2 text-sm transition-all ${
                            isItemSelected(category, item)
                              ? isItemOnBoard(category, item)
                                ? "bg-green-500/30 border-green-400 text-green-100"
                                : "bg-blue-500/30 border-blue-400 text-blue-100"
                              : "bg-white/10 border-white/30 text-white hover:bg-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-white">{item.text}</div>
                            {isItemSelected(category, item) && (
                              <Check className="w-4 h-4 flex-shrink-0" />
                            )}
                          </div>
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
        </div>
      </div>
        <Footer />
        </BackgroundProvider>
    </div>
  );
}