"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, X, Trash2, Calendar, Clock, Palette, Grid3X3, Square, SquareStack, Check } from "lucide-react";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";
import Footer from "../components/footer";
import { campaignService } from "../services/campaignService";
import Header from "../components/header";

// Preset gradients and animations
const backgroundPresets = [
  { id: 1, name: "Ocean Waves", gradient: "from-blue-400 via-blue-600 to-purple-700", animation: "wave" },
  { id: 2, name: "Sunset Glow", gradient: "from-orange-400 via-pink-500 to-purple-600", animation: "glow" },
  { id: 3, name: "Forest Mystery", gradient: "from-green-400 via-teal-500 to-blue-600", animation: "float" },
  { id: 4, name: "Cherry Blossom", gradient: "from-pink-300 via-purple-400 to-indigo-500", animation: "drift" },
  { id: 5, name: "Golden Hour", gradient: "from-yellow-400 via-orange-500 to-red-600", animation: "pulse" },
  { id: 6, name: "Arctic Aurora", gradient: "from-cyan-300 via-blue-400 to-indigo-600", animation: "shimmer" },
];

const boardSizes = [
  { size: "3x3", value: 3, icon: Grid3X3, goal: "BON" },
  { size: "4x4", value: 4, icon: Square, goal: "BONG" },
  { size: "5x5", value: 5, icon: SquareStack, goal: "BONGI" }
];

export default function CreateCampaign() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Categories, 3: Review
  
  // Campaign data
  const [title, setTitle] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(backgroundPresets[3]);
  const [boardSize, setBoardSize] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");

  // Background stuff
  const [showGradient, setShowGradient] = useState(true);
  const [showDots, setShowDots] = useState(true);

  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Categories
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("choose_many"); // choose_many, choose_one_required, choose_one_optional
  const [newCategoryItems, setNewCategoryItems] = useState([""]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const addCategory = () => {
    if (newCategoryName.trim() && newCategoryItems.some(item => item.trim())) {
      const category = {
        id: Date.now(),
        name: newCategoryName,
        type: newCategoryType,
        items: newCategoryItems.filter(item => item.trim()),
        required: newCategoryType === "choose_one_required"
      };
      
      setCategories([...categories, category]);
      setNewCategoryName("");
      setNewCategoryType("choose_many");
      setNewCategoryItems([""]);
    }
  };

  const removeCategory = (id) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const addCategoryItem = () => {
    setNewCategoryItems([...newCategoryItems, ""]);
  };

  const updateCategoryItem = (index, value) => {
    const updated = [...newCategoryItems];
    updated[index] = value;
    setNewCategoryItems(updated);
  };

  const removeCategoryItem = (index) => {
    if (newCategoryItems.length > 1) {
      setNewCategoryItems(newCategoryItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      const campaignData = {
        title,
        description,
        backgroundPreset: selectedPreset.id,
        boardSize,
        startDateTime: new Date(`${startDate}T${startTime}:00`).toLocaleString("sv", { timeZone: "UTC" }),
        timeZone,
        categories: categories.map(cat => ({
          name: cat.name,
          type: cat.type,
          required: cat.required,
          items: cat.items
        }))
      };

      const response = await campaignService.createCampaign(campaignData);
      if (response.ok) {
        const data = await response.json();
        // Show success with campaign code
        alert(`Campaign created! Your code is: ${data.campaign.code}`);
        router.push(`/${data.campaign.code}`); // Redirect to build a board there
      } else {
        alert("Error creating campaign. Please try again.");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert("Error creating campaign. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTypeLabel = (type) => {
    switch (type) {
      case "choose_many": return "Choose Many";
      case "choose_one_required": return "Choose One (Required)";
      case "choose_one_optional": return "Choose One (Optional)";
      default: return type;
    }
  };

  const getCategoryTypeColor = (type) => {
    switch (type) {
      case "choose_many": return "bg-blue-500/20 border-blue-400";
      case "choose_one_required": return "bg-red-500/20 border-red-400";
      case "choose_one_optional": return "bg-green-500/20 border-green-400";
      default: return "bg-gray-500/20 border-gray-400";
    }
  };

  return (

  <div className={`w-full h-100 rounded-2xl border-2 border-white/30`}>
    <BackgroundProvider selectedPreset={selectedPreset}>
    <Background />
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <br />
      <br />

      <div className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="w-32"></div> {/* Spacer */}

            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Create Campaign</h1>
              <div className="flex items-center space-x-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-3 h-3 rounded-full ${
                      s <= step ? "bg-green-400" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="w-32"></div> {/* Spacer */}
          </div>

          {/* Step 1: Basic Information */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
                
                {/* Campaign Title */}
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-2">Campaign Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your campaign title..."
                    className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border-3 border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Campaign Description */}
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe your campaign..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border-3 border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Background Preset */}
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-4">Background Theme</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {backgroundPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset)}
                        className={`relative p-4 rounded-xl border-3 transition-all ${
                          selectedPreset.id === preset.id
                            ? "border-white scale-105"
                            : "border-white/30 hover:border-white/50"
                        }`}
                      >
                        <div className={`w-full h-16 bg-gradient-to-r ${preset.gradient} rounded-lg mb-2`}></div>
                        <p className="text-white text-sm font-medium">{preset.name}</p>
                        {selectedPreset.id === preset.id && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-5 h-5 text-white bg-green-500 rounded-full p-1" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Board Size */}
                <div className="mb-6">
                  <label className="block text-white font-semibold mb-4">Board Size</label>
                  <div className="flex space-x-4">
                    {boardSizes.map((size) => {
                      const IconComponent = size.icon;
                      return (
                        <button
                          key={size.value}
                          onClick={() => setBoardSize(size.value)}
                          className={`flex-1 p-4 rounded-xl border-3 transition-all ${
                            boardSize === size.value
                              ? "border-white bg-white/10 scale-105"
                              : "border-white/30 hover:border-white/50"
                          }`}
                        >
                          <IconComponent className="w-8 h-8 text-white mx-auto mb-2" />
                          <p className="text-white font-semibold">{size.size}</p>
                          <p className="text-gray-300 text-sm">Goal: {size.goal}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Start Date & Time */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-white font-semibold mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-3 border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-3 border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                <label className="block text-white font-semibold mb-2">Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-3 border-white/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {Intl.supportedValuesOf("timeZone").map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

                {/* Next Button */}
                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(2)}
                    disabled={!title || !startDate || !startTime}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold border-3 border-white/30 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next: Add Categories
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Categories */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Existing Categories */}
                {categories.length > 0 && (
                  <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">Added Categories</h3>
                    <div className="space-y-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className={`p-4 rounded-xl border-2 ${getCategoryTypeColor(category.type)}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-white font-semibold">{category.name}</h4>
                              <p className="text-gray-300 text-sm">{getCategoryTypeLabel(category.type)}</p>
                            </div>
                            <button
                              onClick={() => removeCategory(category.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {category.items.map((item, idx) => (
                              <span
                                key={idx}
                                className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Category */}
                <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6">Add New Category</h3>
                  
                  {/* Category Name & Type */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Category Name</label>
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Predictions, Events, etc."
                        className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 border-3 border-white/30 focus:border-green-400 focus:ring-2 focus:ring-green-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Category Type</label>
                      <div className="flex items-center gap-4 mb-2">
                        <label className="text-white font-semibold">Selection Type:</label>
                        <select
                          value={newCategoryType}
                          onChange={(e) => setNewCategoryType(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-white/10 text-white border-2 border-white/30"
                        >
                          <option value="choose_many">Select Many</option>
                          <option value="choose_one">Select One</option>
                        </select>

                        <label className="flex items-center gap-2 text-white">
                          <input
                            type="checkbox"
                            checked={newCategoryType.includes("required")}
                            onChange={(e) => {
                              const baseType = newCategoryType.includes("choose_many") ? "choose_many" : "choose_one";
                              setNewCategoryType(e.target.checked ? `${baseType}_required` : baseType);
                            }}
                            className="accent-green-500"
                          />
                          Required
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Category Items */}
                  <div className="mb-4">
                    <label className="block text-white font-semibold mb-2">Category Items</label>
                    <div className="space-y-2">
                      {newCategoryItems.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => updateCategoryItem(index, e.target.value)}
                            placeholder={`Item ${index + 1}...`}
                            className="flex-1 px-4 py-2 rounded-xl bg-white/10 text-white placeholder-gray-300 border-2 border-white/30 focus:border-green-400 transition-all"
                          />
                          {newCategoryItems.length > 1 && (
                            <button
                              onClick={() => removeCategoryItem(index)}
                              className="text-red-400 hover:text-red-300 p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addCategoryItem}
                        className="flex items-center text-green-400 hover:text-green-300 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </button>
                    </div>
                  </div>

                  {/* Add Category Button */}
                  <button
                    onClick={addCategory}
                    disabled={!newCategoryName || !newCategoryItems.some(item => item.trim())}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold border-3 border-white/30 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Add Category
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(1)}
                    className="bg-white/10 text-white px-6 py-3 rounded-xl font-semibold border-3 border-white/30 hover:border-white/50 transition-all"
                  >
                    Back
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(3)}
                    disabled={categories.length === 0}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold border-3 border-white/30 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Review & Create
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review & Create */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Review Campaign</h2>
                
                {/* Campaign Summary */}
                <div className="space-y-6 mb-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-white font-semibold mb-2">Campaign Title</h3>
                      <p className="text-gray-300">{title}</p>
                    </div>

                    <div>
                      <h3 className="text-white font-semibold mb-2">Description</h3>
                      <p className="text-gray-300">{description}</p>
                    </div>

                    <div>
                      <h3 className="text-white font-semibold mb-2">Board Size</h3>
                      <p className="text-gray-300">{boardSize}x{boardSize} (Goal: {boardSizes.find(s => s.value === boardSize)?.goal})</p>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">Theme</h3>
                      <p className="text-gray-300">{selectedPreset.name}</p>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">Start Date & Time</h3>
                      <p className="text-gray-300">{new Date(`${startDate}T${startTime}`).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-white font-semibold mb-4">Categories ({categories.length})</h3>
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <div key={category.id} className={`p-4 rounded-xl border-2 ${getCategoryTypeColor(category.type)}`}>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-white font-medium">{category.name}</h4>
                            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">
                              {getCategoryTypeLabel(category.type)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {category.items.map((item, idx) => (
                              <span key={idx} className="text-gray-300 text-sm">
                                {item}{idx < category.items.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(2)}
                    className="bg-white/10 text-white px-6 py-3 rounded-xl font-semibold border-3 border-white/30 hover:border-white/50 transition-all"
                  >
                    Back to Edit
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreateCampaign}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold border-3 border-white/30 hover:border-white/50 disabled:opacity-50 transition-all"
                  >
                    {loading ? "Creating..." : "Create Campaign"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer
        showDots={showDots}
        showGradient={showGradient}
      />
    </div>
      </BackgroundProvider>
    </div>
  );
}