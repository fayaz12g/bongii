const serverPath = "http://localhost:3001/api";

export const campaignService = {

  // Check if a campaign exists by code
  async validateCampaign(code) {
    try {
      const response = await fetch(`${serverPath}/campaigns/validate/${code}`, {
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
      const response = await fetch(`${serverPath}/campaigns/${code}`, {
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
  
 // Create a new Bongii campaign
  async createCampaign(payload) {
    const res = await fetch(serverPath + '/campaigns', {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
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
  async createPlayerBoard(campaignCode, payload) {
    const res = await fetch(serverPath + `/campaigns/${campaignCode}/board`, {
      method: "POST",
      body: JSON.stringify({
        playerName: payload.playerName,
        selectedTiles: payload.selectedTiles, // array of {categoryItemId, position}
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  // Get player board by unique board code
  async getPlayerBoard(boardCode) {
    try {
      const response = await fetch(`${serverPath}/boards/${boardCode}`, {
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

  // Update player board tiles
  async updatePlayerBoard(boardCode, payload) {
    const res = await fetch(serverPath + `/boards/${boardCode}`, {
      method: "PUT",
      body: JSON.stringify({
        tiles: payload.tiles, // array of tile updates
        playerName: payload.playerName,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  // Start campaign (moderator only)
  async startCampaign(campaignCode) {
    const res = await fetch(serverPath + `/campaigns/${campaignCode}/start`, {
      method: "POST",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  // Call item correct/incorrect (moderator only)
  async callCampaignItem(campaignCode, itemId, status) {
    const res = await fetch(serverPath + `/campaigns/${campaignCode}/call`, {
      method: "POST",
      body: JSON.stringify({
        itemId: itemId,
        status: status, // 'correct' or 'incorrect'
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  // Get campaign results/winners
  async getCampaignResults(campaignCode) {
    try {
      const response = await fetch(`${serverPath}/campaigns/${campaignCode}/results`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching campaign results:', error);
      throw error;
    }
  },

  // Delete campaign
  async deleteCampaign(code) {
    const res = await fetch(serverPath + `/campaigns/${code}`, {
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
    const res = await fetch(serverPath + '/campaigns/user', {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  // Get background presets
  async getBackgroundPresets() {
    try {
      const response = await fetch(`${serverPath}/background-presets`, {
        method: 'GET',
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching background presets:', error);
      throw error;
    }
  }
};
