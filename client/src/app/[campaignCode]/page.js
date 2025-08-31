"use client";
import { campaignService } from "../services/campaignService";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Calendar, MapPin } from "lucide-react";

export default function CampaignPage() {
  const { campaignCode } = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await campaignService.getCampaign(campaignCode);
        if (response.ok) {
          const data = await response.json();
          setCampaign(data);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Home</span>
          </button>
          
          <div className="text-right">
            <p className="text-white/70 text-sm">Campaign Code</p>
            <p className="text-white text-xl font-bold tracking-wider">{campaignCode}</p>
          </div>
        </div>

        {/* Campaign Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Main Campaign Card */}
          <div className="bg-black/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20 shadow-2xl mb-8">
            {/* Campaign Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">{campaign?.name}</h1>
              <p className="text-xl text-gray-300 leading-relaxed">{campaign?.description}</p>
            </div>

            {/* Campaign Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-500/20 rounded-2xl p-6 border border-blue-400/30 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Players</h3>
                <p className="text-blue-400 text-2xl font-bold">{campaign?.playerCount || 0}</p>
              </div>
              
              <div className="bg-green-500/20 rounded-2xl p-6 border border-green-400/30 text-center">
                <Calendar className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Sessions</h3>
                <p className="text-green-400 text-2xl font-bold">{campaign?.sessionCount || 0}</p>
              </div>
              
              <div className="bg-purple-500/20 rounded-2xl p-6 border border-purple-400/30 text-center">
                <MapPin className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Setting</h3>
                <p className="text-purple-400 text-lg font-semibold">{campaign?.setting || "Fantasy"}</p>
              </div>
            </div>

            {/* Campaign Details */}
            {campaign?.gameSystem && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
                <h3 className="text-white font-semibold text-xl mb-3">Game System</h3>
                <p className="text-gray-300 text-lg">{campaign.gameSystem}</p>
              </div>
            )}

            {campaign?.nextSession && (
              <div className="bg-yellow-500/20 rounded-2xl p-6 border border-yellow-400/30">
                <h3 className="text-yellow-400 font-semibold text-xl mb-3">Next Session</h3>
                <p className="text-white text-lg">{new Date(campaign.nextSession).toLocaleDateString("en-US", {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg font-semibold border-4 border-white/30 hover:border-white/50 transition-colors"
            >
              Join Campaign
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-2xl shadow-lg font-semibold border-4 border-white/30 hover:border-white/50 transition-colors"
            >
              View Character Sheet
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}