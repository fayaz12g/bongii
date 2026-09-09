import { getServerPath } from '../utils/config';

export const campaignService = {

  // Check if a campaign exists by code
  async validateCampaign(code) {
    try {
      const response = await fetch(`${getServerPath()}/campaigns/validate/${code}`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });

      if (response.ok) {
        return true; // ✅ found
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error('Error validating campaign:', error);
      throw error; // let caller handle it
    }
  },


  // Get campaign details by code
  async getCampaign(code) {
    try {
      const response = await fetch(`${getServerPath()}/campaigns/${code}`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  },

  // Get all campaigns
  async getCampaigns({ group, query } = {}) {
    try {
      const searchParams = new URLSearchParams();
      if (group) searchParams.set("group", group);
      if (query) searchParams.set("query", query);
      const search = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
      const response = await fetch(`${getServerPath()}/campaigns${search}`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  },

    // Get all boards
  async getAllBoards() {
    try {
      const response = await fetch(`${getServerPath()}/boards`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching boards:', error);
      throw error;
    }
  },

  // Get campaign boards
  async getCampaignBoards(campaignCode) {
    try {
      const response = await fetch(`${getServerPath()}/campaigns/${campaignCode}/boards`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching campaign boards:', error);
      throw error;
    }
  },


 // Create a new Bongii campaign
  async createCampaign(payload) {
    const res = await fetch(`${getServerPath()}/campaigns`, {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        backgroundPreset: payload.backgroundPreset,
        boardSize: payload.boardSize,
        startDateTime: payload.startDateTime,
        categories: payload.categories,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  // Create a player board for a campaign
  async createPlayerBoard(payload) {
  const res = await fetch(`${getServerPath()}/campaigns/${payload.campaignCode}/board`, {
    method: "POST",
    body: JSON.stringify({
      playerName: payload.playerName,
      selectedTiles: payload.selectedTiles
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
  });

  return res;
},


  // Get player board by unique board code
  async getPlayerBoard(boardCode) {
    try {
      const response = await fetch(`${getServerPath()}/boards/${boardCode}`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching player board:', error);
      throw error;
    }
  },

  async getModeratorCampaign(campaignCode) {
    return fetch(`${getServerPath()}/moderate/campaigns/${campaignCode}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
  },

  async transitionCampaign(campaignCode, action) {
    const paths = {
      publish: "publish",
      lock: "lock",
      reopen: "reopen",
      startModeration: "moderation",
      cancel: "cancel",
    };
    const path = paths[action];
    if (!path) throw new Error(`Unknown campaign action: ${action}`);

    const res = await fetch(`${getServerPath()}/campaigns/${campaignCode}/${path}`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return res;
  },

  async updateItemOutcome(campaignCode, itemId, status) {
    return fetch(`${getServerPath()}/campaigns/${campaignCode}/items/${itemId}/outcome`, {
      method: "POST",
      body: JSON.stringify({ status }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
  },

  async finalizeCampaign(campaignCode) {
    return fetch(`${getServerPath()}/campaigns/${campaignCode}/finalize`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
  },

  async getCampaignResults(campaignCode, page = 1) {
    return fetch(`${getServerPath()}/campaigns/${campaignCode}/results?page=${page}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });
  },

  // Delete campaign
  async deleteCampaign(code) {
    const res = await fetch(`${getServerPath()}/campaigns/${code}`, {
      method: "DELETE",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  // Get user's campaigns
  async getUserCampaigns() {
    const res = await fetch(`${getServerPath()}/moderate/campaigns`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  }
};
