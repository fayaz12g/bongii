import { useEffect, useState } from "react";
import Link from "next/link";
import { campaignService } from "../services/campaignService";
import Footer from "react-multi-date-picker/plugins/range_picker_footer";
import Background from "../components/background";
import { BackgroundProvider } from "../components/context";

export default function Moderate() {
  const [campaigns, setCampaigns] = useState([]);

  const loadCampaigns = async () => {
    try {
      const res = await campaignService.getUserCampaigns();
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleDelete = async (code) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const res = await campaignService.deleteCampaign(code);
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.code !== code));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete campaign");
      }
    } catch (err) {
      console.error("Error deleting campaign:", err);
    }
  };

  return (
    <div className="p-6">
      <BackgroundProvider>
        <Background />
      <h1 className="text-2xl font-bold mb-4">My Campaigns</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((c) => (
          <div
            key={c.code}
            className="p-4 border rounded-lg shadow flex flex-col justify-between"
          >
            <div>
              <Link href={`/moderate/${c.code}`}>
                <h2 className="text-xl font-semibold hover:underline">
                  {c.name}
                </h2>
              </Link>
              <p className="text-gray-600">{c.description}</p>
              <p className="text-sm text-gray-500">
                Players: {c.playerCount} | Preset: {c.presetName}
              </p>
            </div>
            <button
              onClick={() => handleDelete(c.code)}
              className="mt-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      <Footer />
      </BackgroundProvider>
    </div>
  );
}
