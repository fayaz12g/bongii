const serverPath = "http://localhost:3001/api";

export const profileService = {


  async getUserData() {
    const res = await fetch(serverPath + '/users/current', {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  async updateUserData(userData) {
    const res = await fetch(serverPath + '/users/current', {
      method: "PUT",
      body: JSON.stringify({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        profileIcon: userData.profileIcon,
        username: userData.username,
        password: userData.password,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

}