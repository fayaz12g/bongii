const serverPath = "http://localhost:3001/api";

export const volunteerService = {

  async getTime() {
    const res = await fetch(serverPath + '/requests/time', {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  async getFinance() {
    const res = await fetch(serverPath + '/requests/finance', {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
    return Promise.resolve(res);
  },

  async getItems() {
    const res = await fetch(serverPath + '/requests/item', {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });
    return Promise.resolve(res);
  },

  async getPostById(postId, service) {
    const res = await fetch(serverPath + `/requests/${service}/${postId}`, {
        method: "GET",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
    return Promise.resolve(res);
  },

  async postComment(postId, newComment, date, service) {
    const res = await fetch(serverPath + `/comments/${service}`, {
        method: "POST",
        body: JSON.stringify({
          requestId: postId,
          message: newComment,
          datePosted: date,
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
    return Promise.resolve(res);
  },

}