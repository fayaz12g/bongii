import { getServerPath } from '../utils/config';

export const userService = {

  async getUsers() {
    const res = await fetch(`${getServerPath()}/users`);
    return Promise.resolve(res.json());
  },

  async addUser(firstName, lastName, username, password, email, profileIcon) {
    const res = await fetch(`${getServerPath()}/users`, {
      method: "POST",
      body: JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        username: username,
        password: password,
        email: email,
        profileIcon: profileIcon
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      }
    });

    return Promise.resolve(res);
  },

  async loginUser(username, password) {
    const res = await fetch(`${getServerPath()}/login`, {
      method: "POST",
      body: JSON.stringify({
        username: username,
        password: password
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      }
    });

    return Promise.resolve(res);
  }

}