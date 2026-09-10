"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Background from "../components/background";
import { useBackground } from "../components/context";
import Footer from "../components/footer";
import { campaignService } from "../services/campaignService";
import Header from "../components/header";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { Plus, X, Trash2, Palette, Grid3X3, Square, SquareStack, Check, Sparkles, Wand2, ChevronLeft, ChevronRight, Download, Upload, Coins } from "lucide-react";
import { downloadExampleCampaign, parseCampaignImport } from "./campaignImport.mjs";


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
  const { firebaseUser, profile, syncProfile } = useRequireAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Categories, 3: Review
  
  // Campaign data
  const [title, setTitle] = useState("");
  const { selectedPreset, setSelectedPreset } = useBackground();
  const [themeMode, setThemeMode] = useState('preset');
  const [boardSize, setBoardSize] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");


// Pre-validated gradient combinations that are guaranteed to work
const validGradientCombinations = [
  // Blues
  { name: 'Ocean Blue', gradient: 'from-blue-400 via-blue-600 to-blue-800' },
  { name: 'Sky Blue', gradient: 'from-sky-300 via-sky-500 to-sky-700' },
  { name: 'Cyan Dream', gradient: 'from-cyan-300 via-blue-500 to-indigo-700' },
  
  // Purples
  { name: 'Royal Purple', gradient: 'from-purple-400 via-purple-600 to-purple-800' },
  { name: 'Violet Storm', gradient: 'from-violet-300 via-purple-500 to-indigo-700' },
  { name: 'Mystic Purple', gradient: 'from-fuchsia-400 via-purple-500 to-indigo-600' },
  
  // Pinks
  { name: 'Rose Garden', gradient: 'from-pink-300 via-pink-500 to-rose-600' },
  { name: 'Flamingo', gradient: 'from-pink-400 via-rose-500 to-pink-700' },
  { name: 'Sunset Pink', gradient: 'from-orange-300 via-pink-400 to-purple-600' },
  
  // Greens
  { name: 'Forest Green', gradient: 'from-green-400 via-green-600 to-emerald-700' },
  { name: 'Emerald Sea', gradient: 'from-emerald-300 via-teal-500 to-cyan-600' },
  { name: 'Lime Fresh', gradient: 'from-lime-300 via-green-500 to-emerald-600' },
  
  // Warm Colors
  { name: 'Sunset Glow', gradient: 'from-orange-400 via-pink-500 to-purple-600' },
  { name: 'Fire Storm', gradient: 'from-red-400 via-orange-500 to-yellow-600' },
  { name: 'Golden Hour', gradient: 'from-yellow-400 via-orange-500 to-red-600' },
  
  // Cool Colors
  { name: 'Arctic Frost', gradient: 'from-cyan-200 via-blue-400 to-indigo-600' },
  { name: 'Winter Sky', gradient: 'from-blue-200 via-indigo-400 to-purple-600' },
  { name: 'Ice Crystal', gradient: 'from-cyan-300 via-sky-400 to-blue-500' }
];

// Custom theme settings
const [customTheme, setCustomTheme] = useState({
  name: "",
  selectedGradient: validGradientCombinations[0].gradient,
  gradientName: validGradientCombinations[0].name,
  animation: 'wave'
});

const animationTypes = [
  { id: 'wave', name: 'Wave', icon: '〜' },
  { id: 'glow', name: 'Glow', icon: '✦' },
  { id: 'float', name: 'Float', icon: '↕' },
  { id: 'drift', name: 'Drift', icon: '→' },
  { id: 'pulse', name: 'Pulse', icon: '◉' },
  { id: 'shimmer', name: 'Shimmer', icon: '✨' }
];

  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Categories
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("choose_many"); // choose_many, choose_one_required, choose_one_optional
  const [newCategoryItems, setNewCategoryItems] = useState([""]);
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [creationError, setCreationError] = useState("");
  const importInputRef = useRef(null);

// Use the custom theme if present
useEffect(() => {
  if (themeMode === 'custom') {
    const customThemeObject = {
      id: 'custom',
      name: customTheme.name || 'Custom Theme',
      gradient: customTheme.selectedGradient || 'from-blue-400 via-blue-600 to-blue-800',
      animation: customTheme.animation
    };
    setSelectedPreset(customThemeObject);
  }
}, [customTheme, themeMode, setSelectedPreset]);

  const addCategory = () => {
    if (newCategoryName.trim() && newCategoryItems.some(item => item.trim())) {
      const category = {
        id: Date.now(),
        name: newCategoryName,
        type: newCategoryType,
        items: newCategoryItems.filter(item => item.trim()),
        required: newCategoryType.endsWith("_required")
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

  const updateCategory = (id, updates) => {
    setCategories((current) => current.map((category) => (
      category.id === id ? { ...category, ...updates } : category
    )));
  };

  const updateExistingCategoryItem = (categoryId, itemIndex, value) => {
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? {
            ...category,
            items: category.items.map((item, index) => (index === itemIndex ? value : item)),
          }
        : category
    )));
  };

  const addExistingCategoryItem = (categoryId) => {
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? { ...category, items: [...category.items, ""] }
        : category
    )));
  };

  const removeExistingCategoryItem = (categoryId, itemIndex) => {
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? { ...category, items: category.items.filter((_, index) => index !== itemIndex) }
        : category
    )));
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

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportMessage("");
    try {
      const imported = parseCampaignImport(await file.text());
      const [importedDate, importedTime] = imported.startDateTime.split("T");
      const preset = backgroundPresets.find(({ id }) => id === imported.backgroundPresetId);
      setTitle(imported.title);
      setDescription(imported.description);
      setBoardSize(imported.boardSize);
      setStartDate(importedDate);
      setStartTime(importedTime);
      if (imported.timeZone) setTimeZone(imported.timeZone);
      setThemeMode("preset");
      setSelectedPreset(preset || backgroundPresets[0]);
      setCategories(imported.categories.map((category, index) => ({
        ...category,
        id: `${Date.now()}-${index}`,
        required: category.required ?? category.type.endsWith("_required"),
      })));
      setStep(1);
      setImportMessage(`Imported ${imported.categories.length} categories. Review and edit before creating.`);
    } catch (error) {
      setImportError(error.message);
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateCampaign = async () => {
    setCreationError("");
    if ((profile?.doubleOrNothingCredits ?? 0) < 10) {
      setCreationError("Campaign creation requires 10 tokens.");
      return;
    }
    setLoading(true);
    try {
      const campaignData = {
        title,
        description,
        backgroundPreset: selectedPreset,
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
        if (data.remainingDoubleOrNothingCredits !== undefined && firebaseUser) {
          syncProfile(firebaseUser).catch((profileError) => {
            console.error("Error refreshing token balance:", profileError);
          });
        }
        router.push(`/moderate/${data.campaign.code}`);
      } else {
        const data = await response.json().catch(() => ({}));
        setCreationError(data.error || "Campaign creation failed. Please try again.");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      setCreationError("Campaign creation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryTypeLabel = (type) => {
    switch (type) {
      case "choose_many": return "Choose Many";
      case "choose_many_required": return "Choose Many (Required)";
      case "choose_one": return "Choose One";
      case "choose_one_required": return "Choose One (Required)";
      default: return type;
    }
  };

  const getCategoryTypeColor = (type) => {
    switch (type) {
      case "choose_many": return "bg-blue-500/20 border-blue-400";
      case "choose_many_required": return "bg-cyan-500/20 border-cyan-400";
      case "choose_one": return "bg-green-500/20 border-green-400";
      case "choose_one_required": return "bg-red-500/20 border-red-400";
      default: return "bg-gray-500/20 border-gray-400";
    }
  };

  const requiredItemCount = (boardSize * boardSize) - (boardSize % 2 === 1 ? 1 : 0);
  const selectableItemCount = categories.reduce(
    (total, category) => total + category.items.length,
    0,
  );
  const hasEnoughItems = selectableItemCount >= requiredItemCount;

  return (

  <div className="app-page w-full">
    <Background />
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <br />
      <br />

      <div className="flex-1 px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex gap-2 sm:w-56">
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="ui-button-secondary"
              >
                <Upload className="h-4 w-4" />
                Import JSON
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                aria-label="Import campaign JSON file"
                onChange={handleImport}
                className="sr-only"
              />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Create Campaign</h1>
              <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-200">
                <Coins className="h-4 w-4" aria-hidden="true" />
                10 tokens · {profile?.doubleOrNothingCredits ?? 0} available
              </p>
              <p className="sr-only">Step {step} of 4</p>
              <div className="flex items-center space-x-2" aria-hidden="true">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`w-3 h-3 rounded-full ${
                      s <= step ? "bg-green-400" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end sm:w-56">
              <button
                type="button"
                onClick={downloadExampleCampaign}
                className="ui-button-secondary"
              >
                <Download className="h-4 w-4" />
                Example JSON
              </button>
            </div>
          </div>

          {(importMessage || importError) && (
            <p
              role={importError ? "alert" : "status"}
              className={`mb-6 border-l-4 px-4 py-3 text-sm ${
                importError
                  ? "border-rose-400 bg-rose-500/15 text-rose-100"
                  : "border-emerald-400 bg-emerald-500/15 text-emerald-100"
              }`}
            >
              {importError || importMessage}
            </p>
          )}

          {/* Step 1: Basic Information */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <div>
                  <motion.div
                    className="app-panel p-5 sm:p-8"
                  >
                    <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
                    
                    {/* Campaign Title */}
                    <div className="mb-6">
                      <label htmlFor="campaign-title" className="block text-white font-semibold mb-2">Campaign Title</label>
                      <input
                        id="campaign-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter your campaign title..."
                        className="ui-field"
                      />
                    </div>

                    {/* Campaign Description */}
                    <div className="mb-6">
                      <label htmlFor="campaign-description" className="block text-white font-semibold mb-2">Description</label>
                      <textarea
                        id="campaign-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Briefly describe your campaign..."
                        rows={3}
                        className="ui-field"
                      />
                    </div>

                    {/* Board Size */}
                    <fieldset className="mb-6">
                      <legend className="block text-white font-semibold mb-4">Board Size</legend>
                      <div className="flex gap-4">
                        {boardSizes.map((size) => {
                          const IconComponent = size.icon;
                          return (
                            <button
                              type="button"
                              key={size.value}
                              onClick={() => setBoardSize(size.value)}
                              aria-pressed={boardSize === size.value}
                              className={`flex-1 rounded-md border p-4 transition-colors ${
                                boardSize === size.value
                                  ? "border-focus bg-panel-strong"
                                  : "border-line hover:border-slate-300"
                              }`}
                            >
                              <IconComponent className="w-8 h-8 text-white mx-auto mb-2" />
                              <p className="text-white font-semibold">{size.size}</p>
                              <p className="text-gray-300 text-sm">Goal: {size.goal}</p>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {/* Start Date & Time */}
                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                      <div>
                        <label htmlFor="campaign-start-date" className="block text-white font-semibold mb-2">Start Date</label>
                        <input
                          id="campaign-start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="ui-field"
                        />
                      </div>
                      <div>
                        <label htmlFor="campaign-start-time" className="block text-white font-semibold mb-2">Start Time</label>
                        <input
                          id="campaign-start-time"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="ui-field"
                        />
                      </div>
                    </div>

                    <div className="mb-8">
                      <label htmlFor="campaign-time-zone" className="block text-white font-semibold mb-2">Time Zone</label>
                      <select
                        id="campaign-time-zone"
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        className="ui-field"
                      >
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </motion.div>
                  
                  <br />
                
                  {/* Next Button */}
                  <div className="flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStep(2)}
                      disabled={!title || !startDate || !startTime}
                      className="ui-button-primary"
                    >
                      Next: Design Theme
                      <ChevronRight className="w-5 h-5 ml-2 inline" />
                    </motion.button>
                  </div>
                </div>
                )}
                
                {/* Step 2: Theme Design */}
                {step === 2 && (
                  <motion.div
                    className="space-y-6"
                  >
                    <div className="app-panel p-5 sm:p-8">
                      <div className="flex items-center mb-6">
                        <Palette className="w-6 h-6 text-white mr-3" />
                        <h2 className="text-2xl font-bold text-white">Choose Your Theme</h2>
                      </div>

                      {/* Theme Mode Selector */}
                      <div className="mb-8 flex" role="group" aria-label="Theme source">
                        <button
                          type="button"
                          onClick={() => setThemeMode('preset')}
                          aria-pressed={themeMode === 'preset'}
                          className={`flex min-h-11 flex-1 items-center justify-center rounded-l-md border px-4 py-3 transition-colors ${
                            themeMode === 'preset'
                              ? 'border-focus bg-panel-strong text-white'
                              : 'border-line bg-panel text-muted hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-5 h-5 mr-2" />
                          Preset Themes
                        </button>
                        <button
                          type="button"
                          onClick={() => setThemeMode('custom')}
                          aria-pressed={themeMode === 'custom'}
                          className={`flex min-h-11 flex-1 items-center justify-center rounded-r-md border px-4 py-3 transition-colors ${
                            themeMode === 'custom'
                              ? 'border-focus bg-panel-strong text-white'
                              : 'border-line bg-panel text-muted hover:text-white'
                          }`}
                        >
                          <Wand2 className="w-5 h-5 mr-2" />
                          Custom Theme
                        </button>
                      </div>

                      {/* Preset Themes */}
                      {themeMode === 'preset' && (
                        <div>
                          <h3 className="text-white font-semibold mb-4">Choose a Preset</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {backgroundPresets.map((preset) => (
                              <button
                                type="button"
                                key={preset.id}
                                onClick={() => setSelectedPreset(preset)}
                                aria-pressed={selectedPreset.id === preset.id}
                                className={`relative rounded-md border p-4 transition-colors ${
                                  selectedPreset.id === preset.id
                                    ? "border-focus bg-panel-strong"
                                    : "border-line hover:border-slate-300"
                                }`}
                              >
                                <div className={`w-full h-16 bg-gradient-to-r ${preset.gradient} rounded-lg mb-2`}></div>
                                <p className="text-white text-sm font-medium">{preset.name}</p>
                                <p className="text-xs text-muted">{preset.animation}</p>
                                {selectedPreset.id === preset.id && (
                                  <div className="absolute top-2 right-2">
                                    <Check className="w-5 h-5 text-white bg-green-500 rounded-full p-1" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Theme Builder */}
                      {themeMode === 'custom' && (
                        <div className="space-y-6">
                          <div>
                            <label htmlFor="custom-theme-name" className="block text-white font-semibold mb-2">Theme Name</label>
                            <input
                              id="custom-theme-name"
                              type="text"
                              value={customTheme.name}
                              onChange={(e) => setCustomTheme({...customTheme, name: e.target.value})}
                              placeholder="Enter a name for your theme..."
                              className="ui-field"
                            />
                          </div>

                          <div>
                            
                            {/* Pre-crafted Custom Themes */}
                            <div>
                            <h4 className="text-white font-semibold mb-4">Choose a Gradient Style</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              {validGradientCombinations.map((combo, index) => (
                                <button
                                  type="button"
                                  key={index}
                                  onClick={() => setCustomTheme({
                                    ...customTheme, 
                                    selectedGradient: combo.gradient,
                                    gradientName: combo.name
                                  })}
                                  aria-pressed={customTheme.selectedGradient === combo.gradient}
                                  className={`relative rounded-md border p-4 transition-colors ${
                                    customTheme.selectedGradient === combo.gradient
                                      ? "border-focus bg-panel-strong"
                                      : "border-line hover:border-slate-300"
                                  }`}
                                >
                                  <div className={`w-full h-12 bg-gradient-to-r ${combo.gradient} rounded-lg mb-2`}></div>
                                  <p className="text-white text-sm font-medium">{combo.name}</p>
                                  {customTheme.selectedGradient === combo.gradient && (
                                    <div className="absolute top-2 right-2">
                                      <Check className="w-5 h-5 text-white bg-green-500 rounded-full p-1" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>

                            {/* Animation Style */}
                            <div>
                              <label className="block text-white font-semibold mb-3">Animation Style</label>
                              <div className="grid grid-cols-3 gap-3">
                                {animationTypes.map((anim) => (
                                  <button
                                    type="button"
                                    key={anim.id}
                                    onClick={() => setCustomTheme({...customTheme, animation: anim.id})}
                                    aria-pressed={customTheme.animation === anim.id}
                                    className={`rounded-md border p-3 transition-colors ${
                                      customTheme.animation === anim.id
                                        ? 'border-focus bg-panel-strong text-white'
                                        : 'border-line text-muted hover:border-slate-300 hover:text-white'
                                    }`}
                                  >
                                    <div className="text-2xl mb-1">{anim.icon}</div>
                                    <div className="text-sm font-medium">{anim.name}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setStep(1)}
                        className="ui-button-secondary"
                      >
                        <ChevronLeft className="w-5 h-5 mr-2 inline" />
                        Back
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setStep(3)}
                        className="ui-button-primary"
                      >
                        Next: Add Categories
                        <ChevronRight className="w-5 h-5 ml-2 inline" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Categories */}
            {step === 3 && (
              <motion.div
                className="space-y-6"
              >
                {/* Existing Categories */}
                {categories.length > 0 && (
                  <div className="app-panel p-5 sm:p-8">
                    <h3 className="text-xl font-bold text-white mb-4">Added Categories</h3>
                    <div className="space-y-4">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className={`p-4 rounded-xl border-2 ${getCategoryTypeColor(category.type)}`}
                        >
                          <div className="mb-4 flex items-start gap-3">
                            <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
                              <label className="text-sm font-semibold text-white">
                                Category name
                                <input
                                  type="text"
                                  value={category.name}
                                  onChange={(event) => updateCategory(category.id, { name: event.target.value })}
                                  className="mt-1 w-full rounded-md border border-white/30 bg-black/20 px-3 py-2 text-white"
                                />
                              </label>
                              <label className="text-sm font-semibold text-white">
                                Selection type
                                <select
                                  value={category.type}
                                  onChange={(event) => updateCategory(category.id, {
                                    type: event.target.value,
                                    required: event.target.value.endsWith("_required"),
                                  })}
                                  className="mt-1 w-full rounded-md border border-white/30 bg-gray-900 px-3 py-2 text-white"
                                >
                                  <option value="choose_many">Choose Many</option>
                                  <option value="choose_many_required">Choose Many (Required)</option>
                                  <option value="choose_one">Choose One</option>
                                  <option value="choose_one_required">Choose One (Required)</option>
                                </select>
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCategory(category.id)}
                              className="shrink-0 rounded-md p-2 text-red-300 hover:bg-red-500/15"
                              aria-label={`Remove ${category.name}`}
                              title="Remove category"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {category.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(event) => updateExistingCategoryItem(
                                    category.id,
                                    itemIndex,
                                    event.target.value,
                                  )}
                                  aria-label={`${category.name} item ${itemIndex + 1}`}
                                  className="min-w-0 flex-1 rounded-md border border-white/30 bg-black/20 px-3 py-2 text-sm text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeExistingCategoryItem(category.id, itemIndex)}
                                  disabled={category.items.length === 1}
                                  className="rounded-md p-2 text-red-300 hover:bg-red-500/15 disabled:opacity-40"
                                  aria-label={`Remove item ${itemIndex + 1} from ${category.name}`}
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addExistingCategoryItem(category.id)}
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-green-200"
                            >
                              <Plus className="h-4 w-4" />
                              Add item
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Category */}
                <div className="app-panel p-5 sm:p-8">
                  <h3 className="text-xl font-bold text-white mb-6">Add New Category</h3>
                  
                  {/* Category Name & Type */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="new-category-name" className="block text-white font-semibold mb-2">Category Name</label>
                      <input
                        id="new-category-name"
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Predictions, Events, etc."
                        className="ui-field"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Category Type</label>
                      <div className="flex items-center gap-4 mb-2">
                        <label htmlFor="new-category-type" className="text-white font-semibold">Selection Type:</label>
                        <select
                          id="new-category-type"
                          value={newCategoryType}
                          onChange={(e) => setNewCategoryType(e.target.value)}
                          className="ui-field"
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
                            aria-label={`New category item ${index + 1}`}
                            className="ui-field min-w-0 flex-1"
                          />
                          {newCategoryItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCategoryItem(index)}
                              className="rounded-md p-2 text-red-300 hover:bg-red-500/15"
                              aria-label={`Remove new category item ${index + 1}`}
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
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
                    type="button"
                    onClick={addCategory}
                    disabled={!newCategoryName || !newCategoryItems.some(item => item.trim())}
                    className="ui-button-primary w-full"
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
                    className="ui-button-secondary"
                  >
                    Back
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(4)}
                    disabled={!hasEnoughItems}
                    className="ui-button-primary"
                  >
                    Review & Create
                  </motion.button>
                </div>
                {!hasEnoughItems && (
                  <p className="mt-3 text-right text-sm text-amber-200">
                    Add {requiredItemCount - selectableItemCount} more selectable item{requiredItemCount - selectableItemCount === 1 ? "" : "s"} for a {boardSize}x{boardSize} board.
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 4: Review & Create */}
            {step === 4 && (
              <motion.div
                className="app-panel p-5 sm:p-8"
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
                {creationError && (
                  <p role="alert" className="ui-toast mb-6 border-rose-400 text-rose-100">
                    {creationError}
                  </p>
                )}
                <div className="flex justify-between">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(2)}
                    className="ui-button-secondary"
                  >
                    Back to Edit
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreateCampaign}
                    disabled={loading || !hasEnoughItems || (profile?.doubleOrNothingCredits ?? 0) < 10}
                    className="ui-button-primary"
                  >
                    {loading ? "Creating..." : "Create Campaign · 10 tokens"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </div>
    </div>
  );
}