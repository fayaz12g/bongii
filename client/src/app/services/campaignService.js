import { getBoardEditToken } from '../utils/boardAccess.mjs';
import { apiFetch, authenticatedApiFetch, optionalAuthenticatedApiFetch } from './apiClient';

export const campaignService = {

  // Check if a campaign exists by code
  async validateCampaign(code) {
    try {
      const response = await apiFetch(`/campaigns/validate/${code}`, {
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
      const response = await apiFetch(`/campaigns/${code}`, {
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
      const response = await apiFetch(`/campaigns${search}`, {
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
      const response = await apiFetch('/boards', {
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
      const response = await apiFetch(`/campaigns/${campaignCode}/boards`, {
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
    const res = await authenticatedApiFetch('/campaigns', {
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
        "Content-type": "application/json; charset=UTF-8"
      }
    });

    return Promise.resolve(res);
  },

  // Create a player board for a campaign
  async createPlayerBoard(payload) {
  const res = await optionalAuthenticatedApiFetch(`/campaigns/${payload.campaignCode}/board`, {
    method: "POST",
    body: JSON.stringify({
      playerName: payload.playerName,
      selectedTiles: payload.selectedTiles,
      useDoubleOrNothing: Boolean(payload.useDoubleOrNothing),
    }),
    headers: {
      "Content-type": "application/json; charset=UTF-8"
    }
  });

  return res;
},


  // Get player board by unique board code
  async getPlayerBoard(boardCode) {
    try {
      const headers = new Headers({
        "Content-type": "application/json; charset=UTF-8",
      });
      const editToken = getBoardEditToken(boardCode);
      if (editToken) headers.set("X-Board-Edit-Token", editToken);
      const response = await optionalAuthenticatedApiFetch(`/boards/${boardCode}`, {
        method: 'GET',
        headers,
      });
      return response;
    } catch (error) {
      console.error('Error fetching player board:', error);
      throw error;
    }
  },

  async updatePlayerBoard(boardCode, payload) {
    const headers = new Headers({
      "Content-type": "application/json; charset=UTF-8",
    });
    const editToken = getBoardEditToken(boardCode);
    if (editToken) headers.set("X-Board-Edit-Token", editToken);
    return optionalAuthenticatedApiFetch(`/boards/${boardCode}`, {
      method: "PUT",
      body: JSON.stringify({
        playerName: payload.playerName,
        selectedTiles: payload.selectedTiles,
      }),
      headers,
    });
  },

  async getModeratorCampaign(campaignCode) {
    return authenticatedApiFetch(`/moderate/campaigns/${campaignCode}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
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

    const res = await authenticatedApiFetch(`/campaigns/${campaignCode}/${path}`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });

    return res;
  },

  async updateItemOutcome(campaignCode, itemId, status) {
    return authenticatedApiFetch(`/campaigns/${campaignCode}/items/${itemId}/outcome`, {
      method: "POST",
      body: JSON.stringify({ status }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });
  },

  async finalizeCampaign(campaignCode) {
    return authenticatedApiFetch(`/campaigns/${campaignCode}/finalize`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });
  },

  async getCampaignResults(campaignCode, page = 1) {
    return apiFetch(`/campaigns/${campaignCode}/results?page=${page}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });
  },

  // Delete campaign
  async deleteCampaign(code) {
    const res = await authenticatedApiFetch(`/campaigns/${code}`, {
      method: "DELETE",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });

    return Promise.resolve(res);
  },

  // Get user's campaigns
  async getUserCampaigns() {
    const res = await authenticatedApiFetch('/moderate/campaigns', {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    });

    return Promise.resolve(res);
  }
};
