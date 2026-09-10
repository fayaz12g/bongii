"use client";
import { campaignService } from "../services/campaignService";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Eye, Clock, Check, X, Trash2, Play, Shuffle, User, Trophy, Coins, CopyPlus } from "lucide-react";
import Background from "../components/background";
import { BackgroundProvider, useBackground } from "../components/context";
import Footer from "../components/footer";
import Header from "../components/header";
import { useAuth } from "../components/authContext";
import { rememberBoardEditToken } from "../utils/boardAccess.mjs";
import PlayerAvatar from "../components/playerAvatar";

const createEmptyBoard = (size) => {
  const board = Array(size * size).fill(null);
  if (size % 2 === 1) {
    const centerIndex = Math.floor((size * size) / 2);
    board[centerIndex] = { type: 'free', text: 'FREE SPACE', isCenter: true };
  }
  return board;
};

const selectionsFromBoard = (campaign, board) => {
  const selections = {};
  board.filter((tile) => tile && !tile.isCenter).forEach((tile) => {
    const category = campaign.categories.find((candidate) => candidate.id === tile.categoryId);
    const item = category?.items.find((candidate) => candidate.id === tile.categoryItemId);
    if (!category || !item) return;
    if (category.type.startsWith("choose_many")) {
      selections[category.id] = [...(selections[category.id] || []), item];
    } else {
      selections[category.id] = item;
    }
  });
  return selections;
};

const duplicatedItemIdFromBoard = (board) => {
  const itemCounts = new Map();
  board.filter((cell) => cell && !cell.isCenter).forEach((cell) => {
    itemCounts.set(cell.itemId, (itemCounts.get(cell.itemId) || 0) + 1);
  });
  return [...itemCounts.entries()].find(([, count]) => count > 1)?.[0] ?? null;
};

const campaignStatusDetails = {
  open: { label: "Open", message: "Board submissions are open." },
  locked: { label: "Entries locked", message: "Board creation is closed. Existing boards remain available." },
  moderating: { label: "Moderating", message: "Outcomes are being reviewed. This campaign is read-only." },
  completed: { label: "Completed", message: "This campaign is complete and read-only." },
};

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
  const [submissionError, setSubmissionError] = useState("");
  const [editingBoardCode, setEditingBoardCode] = useState(null);
  const [editingUsedDoubleOrNothing, setEditingUsedDoubleOrNothing] = useState(false);
  const boardCellRefs = useRef([]);
  const { setSelectedPreset } = useBackground();
  const {
    firebaseUser,
    isAuthenticated,
    loading: authLoading,
    profile,
    syncProfile,
  } = useAuth();
  const effectivePlayerName = playerName || (!editingBoardCode ? profile?.displayName : "") || "";
  const duplicatedItemId = duplicatedItemIdFromBoard(board);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await campaignService.getCampaign(campaignCode);
        if (response.ok) {
          const data = await response.json();
          console.log(data);
          setCampaign(data);
          setSelectedPreset(data.backgroundPreset);
          const requestedBoardCode = new URLSearchParams(window.location.search).get("edit");
          if (requestedBoardCode) {
            const boardResponse = await campaignService.getPlayerBoard(requestedBoardCode);
            const boardData = await boardResponse.json();
            if (!boardResponse.ok) throw new Error(boardData.error || "Failed to load board");
            if (boardData.campaignCode !== campaignCode.toUpperCase() || !boardData.canEdit) {
              throw new Error("You cannot edit this board");
            }
            const editableBoard = createEmptyBoard(data.boardSize);
            boardData.tiles.forEach((tile) => {
              editableBoard[tile.position] = {
                ...tile,
                itemId: tile.categoryItemId,
              };
            });
            setBoard(editableBoard);
            setSelectedItems(selectionsFromBoard(data, boardData.tiles));
            setPlayerName(boardData.playerName || "");
            setEditingBoardCode(boardData.boardCode);
            setEditingUsedDoubleOrNothing(Boolean(boardData.usedDoubleOrNothing));
          } else {
            setBoard(createEmptyBoard(data.boardSize));
          }
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
  }, [campaignCode, setSelectedPreset]);

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
  if (campaign.status !== "open") return;
  const categoryId = category.id;

  if (category.type.startsWith('choose_many')) {
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
    if (campaign.status !== "open") return;
    // If there's a selected item from choose_many that's not on board, add it
    for (const [categoryId, items] of Object.entries(selectedItems)) {
      const category = campaign.categories.find(cat => cat.id.toString() === categoryId);
      if (category && category.type.startsWith('choose_many')) {
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
    if (campaign.status !== "open") return;
    if (board[index] && !board[index].isCenter) {
      const newBoard = [...board];
      newBoard[index] = null;
      setBoard(newBoard);
    }
  };

  const handleDuplicateTile = (event, index) => {
    event.stopPropagation();
    const cell = board[index];
    const canUseToken = editingBoardCode
      ? editingUsedDoubleOrNothing
      : isAuthenticated && (profile?.doubleOrNothingCredits ?? 0) > 0;
    if (campaign.status !== "open" || !cell || cell.isCenter
      || duplicatedItemId !== null || !canUseToken) return;

    const firstEmpty = board.findIndex((candidate) => candidate === null);
    if (firstEmpty === -1) {
      setSubmissionError("Remove a tile before using Double or Nothing.");
      return;
    }
    const nextBoard = [...board];
    nextBoard[firstEmpty] = { ...cell };
    setBoard(nextBoard);
    setSubmissionError("");
  };

  const handleDragStart = (e, index) => {
    if (campaign.status !== "open") return;
    if (board[index] && !board[index].isCenter) {
      setDraggedItem({ item: board[index], fromIndex: index });
      e.dataTransfer.effectAllowed = 'move';
    }
  };


  const handleDragOver = (e, index) => {
    if (campaign.status !== "open") return;
    e.preventDefault();
    setHoveredCell(index);
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    if (campaign.status !== "open") return;
    setHoveredCell(null);

    if (draggedItem && toIndex !== draggedItem.fromIndex && !board[toIndex]?.isCenter) {
      const newBoard = [...board];

      // Swap dragged item with target cell, even if target is null
      newBoard[toIndex] = draggedItem.item;
      newBoard[draggedItem.fromIndex] = board[toIndex] || null;

      setBoard(newBoard);
    }

    setDraggedItem(null);
  };

  const handleBoardCellKeyDown = (event, index) => {
    if (campaign.status !== "open") return;
    if ((event.key === "Enter" || event.key === " ") && !board[index]) {
      event.preventDefault();
      handleBoardCellClick(index);
      return;
    }
    const offsets = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -campaign.boardSize,
      ArrowDown: campaign.boardSize,
    };
    const offset = offsets[event.key];
    if (!offset || !board[index] || board[index].isCenter) return;
    const target = index + offset;
    const sameRow = Math.floor(index / campaign.boardSize) === Math.floor(target / campaign.boardSize);
    if (target < 0 || target >= board.length
      || ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !sameRow)
      || board[target]?.isCenter) return;
    event.preventDefault();
    const nextBoard = [...board];
    [nextBoard[index], nextBoard[target]] = [nextBoard[target], nextBoard[index]];
    setBoard(nextBoard);
    requestAnimationFrame(() => boardCellRefs.current[target]?.focus());
  };

  const isItemSelected = (category, item) => {
    const categoryItems = selectedItems[category.id];
    if (category.type.startsWith('choose_many')) {
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
  if (campaign.status !== "open") return false;
  if (!effectivePlayerName.trim()) return false;

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

    setSubmissionError("");
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
        playerName: effectivePlayerName.trim(),
        selectedTiles,
        useDoubleOrNothing: duplicatedItemId !== null,
      };

      const response = editingBoardCode
        ? await campaignService.updatePlayerBoard(editingBoardCode, boardData)
        : await campaignService.createPlayerBoard(boardData);

      if (response.ok) {
        const data = await response.json();
        const savedBoardCode = editingBoardCode || data.boardCode;
        if (data.editToken) rememberBoardEditToken(savedBoardCode, data.editToken);
        if (data.remainingDoubleOrNothingCredits !== undefined && firebaseUser) {
          syncProfile(firebaseUser).catch((profileError) => {
            console.error("Error refreshing Double or Nothing tokens:", profileError);
          });
        }
        router.push(`/boards/${savedBoardCode}`);
      } else {
        const data = await response.json();
        setSubmissionError(data.error || "Error creating board. Please try again.");
      }
    } catch (error) {
      console.error("Error finalizing board:", error);
      setSubmissionError("Error creating board. Please try again.");
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
      <div className="app-page flex items-center justify-center">
        <Background />
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-page flex items-center justify-center px-6">
        <Background />
        <div className="text-center max-w-md">
          <div className="app-panel p-8">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Error</h1>
            <p className="text-white mb-6">{error}</p>
            <button
              onClick={() => router.push("/browse")}
              className="ui-button-danger mx-auto"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOpen = campaign.status === "open";
  const canAddDoubleOrNothing = isOpen
    && duplicatedItemId === null
    && (editingBoardCode
      ? editingUsedDoubleOrNothing
      : isAuthenticated && (profile?.doubleOrNothingCredits ?? 0) > 0);
  let doubleOrNothingStatus = "Sign in required";
  if (editingBoardCode) {
    doubleOrNothingStatus = editingUsedDoubleOrNothing
      ? (duplicatedItemId !== null ? "Token used · tile doubled" : "Token used")
      : "Available when creating a board";
  } else if (authLoading) {
    doubleOrNothingStatus = "Checking tokens";
  } else if (isAuthenticated) {
    doubleOrNothingStatus = (profile?.doubleOrNothingCredits ?? 0) > 0
      ? (duplicatedItemId !== null ? "1 token selected" : "Not selected")
      : "No tokens remaining";
  }
  const status = campaignStatusDetails[campaign.status] || {
    label: campaign.status,
    message: "This campaign is read-only.",
  };

  return (
    <div className="app-page">
      <Header />
      <br /> <br /> <br />
      <Background />
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
          <button
            onClick={() => router.push("/browse")}
            className="ui-button-secondary justify-self-start"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back</span>
          </button>
          
          <div className="min-w-0 text-left sm:text-center">
            <h1 className="break-words text-3xl font-bold text-white mb-1">{campaign.title}</h1>
            <p className="text-white/70">Code: {campaignCode}</p>
            <span className="mt-2 inline-block rounded-md border border-white/30 bg-black/20 px-2.5 py-1 text-sm font-semibold text-white">
              {status.label}
            </span>
          </div>
          
          <div className="text-left text-white sm:text-right">
            <div className="mb-1 flex items-center sm:justify-end">
              <Trophy className="w-4 h-4 mr-1" />
              <span className="text-sm">Goal: {getGoal(campaign.boardSize)}</span>
            </div>
            <div className="flex items-center sm:justify-end">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-sm">{campaign.playerCount || 0} players</span>
            </div>
          </div>
        </div>

        <div className={`mb-6 border-l-4 px-4 py-3 text-sm ${
          isOpen
            ? "border-emerald-400 bg-emerald-400/10 text-emerald-100"
            : "border-amber-400 bg-amber-400/10 text-amber-100"
        }`}>
          {status.message}
        </div>

        <div className="grid lg:grid-cols-6 gap-8">
          {/* Categories Panel */}
          <div className="lg:col-span-2">
            <div className="app-panel sticky top-24 p-6">
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
                          <span className="ml-2 rounded bg-red-800 px-2 py-0.5 text-xs text-white">
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
                          disabled={!isOpen}
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
            <div className="app-panel p-5 sm:p-8">
              {/* Player Name Input */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-2">Your Name</label>
                <input
                  type="text"
                  value={effectivePlayerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={!isOpen}
                  placeholder="Enter your name..."
                  className="ui-field"
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
                  role="grid"
                  aria-label="Board layout"
                  aria-describedby="board-keyboard-help"
                >
                  {Array.from({ length: campaign.boardSize }, (_, rowIndex) => (
                    <div key={rowIndex} role="row" className="contents">
                      {board
                        .slice(rowIndex * campaign.boardSize, (rowIndex + 1) * campaign.boardSize)
                        .map((cell, columnIndex) => {
                          const index = rowIndex * campaign.boardSize + columnIndex;
                          return (
                            <div
                              key={index}
                              ref={(element) => { boardCellRefs.current[index] = element; }}
                              role="gridcell"
                              tabIndex={isOpen && !cell?.isCenter ? 0 : undefined}
                              aria-label={cell
                                ? `${cell.text || cell.name}${cell.isCenter ? ", fixed center tile" : ", use arrow keys to move"}`
                                : "Empty board position"}
                              aria-keyshortcuts={isOpen && !cell?.isCenter
                                ? "ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space"
                                : undefined}
                              className={`aspect-square border-2 rounded-xl flex items-center justify-center p-2 text-center transition-all ${
                                isOpen && !cell?.isCenter ? "cursor-pointer" : "cursor-default"
                              } ${
                                cell
                                  ? cell.isCenter
                                    ? "bg-yellow-500/30 border-yellow-400 text-yellow-100"
                                    : "bg-green-500/30 border-green-400 text-green-100 hover:bg-green-500/40"
                                  : hoveredCell === index
                                    ? "bg-blue-500/30 border-blue-400"
                                    : "bg-white/10 border-white/30 hover:bg-white/20"
                              }`}
                              onClick={() => cell ? null : handleBoardCellClick(index)}
                              onKeyDown={(event) => handleBoardCellKeyDown(event, index)}
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, index)}
                              draggable={isOpen && !!cell && !cell.isCenter}
                            >
                              {cell ? (
                                <div className="relative w-full h-full flex items-center justify-center group">
                                  {cell.isCenter ? (
                                    <div className="text-center">
                                      <User className="w-6 h-6 mx-auto mb-1" />
                                      <input
                                        type="text"
                                        value={effectivePlayerName}
                                        onChange={(e) => {
                                          setPlayerName(e.target.value);
                                          updatePlayerName(index, e.target.value);
                                        }}
                                        disabled={!isOpen}
                                        aria-label="Player name in center tile"
                                        placeholder="Your Name"
                                        className="min-h-6 w-full bg-transparent px-1 text-center text-xs text-yellow-100 placeholder-yellow-200/70"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs font-medium break-words">{cell.text || cell.name}</span>
                                      {duplicatedItemId === cell.itemId && (
                                        <span
                                          role="img"
                                          className="absolute bottom-0 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-300 text-slate-950"
                                          aria-label="Double or Nothing tile"
                                          title="Double or Nothing tile"
                                        >
                                          <CopyPlus className="h-3.5 w-3.5" />
                                        </span>
                                      )}
                                      {isOpen && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveFromBoard(index);
                                            }}
                                            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-700 text-white opacity-0 transition-opacity hover:bg-red-800 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
                                            aria-label={`Remove ${cell.text || cell.name} from board`}
                                            title="Remove tile"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                          {canAddDoubleOrNothing && (
                                            <button
                                              type="button"
                                              onClick={(event) => handleDuplicateTile(event, index)}
                                              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-slate-950 shadow-md transition-colors hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                              aria-label={`Duplicate ${cell.text || cell.name} with Double or Nothing`}
                                              title="Duplicate tile"
                                            >
                                              <CopyPlus className="h-4 w-4" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-muted">Empty</div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
                <p id="board-keyboard-help" className="sr-only">
                  Select category items, then use Enter or Space on an empty position to place a selected tile. Use arrow keys on a tile to move it.
                </p>
              </div>

              {isOpen && (
                <div className="mb-6 border-l-4 border-amber-300 bg-amber-300/10 px-4 py-3 text-amber-50">
                  <div className="flex items-center gap-3">
                    <Coins className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">Double or Nothing</h3>
                      <p className="text-sm text-amber-100/80">{doubleOrNothingStatus}</p>
                    </div>
                    {!editingBoardCode && isAuthenticated && (
                      <span className="shrink-0 rounded-md border border-amber-200/40 bg-black/20 px-2.5 py-1 text-sm font-semibold">
                        {profile.doubleOrNothingCredits} tokens
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="bg-white/10 rounded-xl p-4 mb-6">
                  <h3 className="text-white font-semibold mb-2">Board requirements</h3>
                  <p className="text-gray-300 text-sm">
                    Fill every tile and include a selection from each required category.
                  </p>
                </div>
              )}

              {submissionError && (
                <p role="alert" className="ui-toast mb-6 border-rose-400 text-rose-100">
                  {submissionError}
                </p>
              )}

              {/* Finalize Button */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: canFinalize() ? 1.05 : 1 }}
                  whileTap={{ scale: canFinalize() ? 0.97 : 1 }}
                  onClick={handleFinalize}
                  disabled={!canFinalize() || finalizing}
                  className="ui-button-primary px-8 py-4"
                >
                  {!isOpen ? (
                    "Board creation closed"
                  ) : finalizing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                      {editingBoardCode ? "Saving Board..." : "Creating Board..."}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Play className="w-5 h-5 mr-2" />
                      {editingBoardCode ? "Save Board" : "Finalize Board"}
                    </div>
                  )}
                </motion.button>
              </div>

              {isOpen && !canFinalize() && (
                <div className="text-center mt-4">
                  <p className="text-yellow-300 text-sm">
                    {!effectivePlayerName.trim() && "Enter your name and "}
                    Complete all required categories to finalize your board
                  </p>
                </div>
              )}
            </div>
          </div>
         {/* Existing Boards Panel */}
          <div className="lg:col-span-1">
            <div className="app-panel sticky top-24 p-6">
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
                    <p className="text-white/50 text-xs mt-1">
                      {isOpen ? "Be the first to play!" : "Entries are closed."}
                    </p>
                  </div>
                ) : (
                  campaignBoards.map((boardData) => (
                    <motion.button
                      type="button"
                      key={boardData.boardCode}
                      whileHover={{ scale: 1.02 }}
                      className="w-full rounded-md border border-line bg-panel-strong p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-700"
                      onClick={() => router.push(`/boards/${boardData.boardCode}`)}
                    >
                      <div className="mb-3">
                        {renderMiniBoard(boardData, campaign.boardSize)}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <PlayerAvatar
                              avatar={boardData.playerAvatar}
                              name={boardData.playerName}
                              size={28}
                            />
                            <h4 className="truncate text-sm font-medium text-white">
                              {boardData.playerName || 'Anonymous'}
                            </h4>
                          </div>
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
                    </motion.button>
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