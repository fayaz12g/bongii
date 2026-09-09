import { authenticatedApiFetch } from './apiClient';

export const profileService = {


  async getUserData() {
    const res = await authenticatedApiFetch('/users/current', {
      method: "GET",
    });

    return Promise.resolve(res);
  },

  async updateUserData(userData) {
    const res = await authenticatedApiFetch('/users/current', {
      method: "PUT",
      body: JSON.stringify({
        displayName: userData.displayName,
        profileIcon: userData.profileIcon,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      }
    });

    return Promise.resolve(res);
  },

}