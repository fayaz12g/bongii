const serverPath = "http://localhost:3001/api";

export const requestsService = {


  async requestTime(payload) {
    const res = await fetch(serverPath + '/requests/time', {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        link: payload.link,
        tag: payload.tag,
        timeSlots: payload.timeSlots,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  async requestFinance(payload) {
    const res = await fetch(serverPath + '/requests/finance', {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        link: payload.link,
        tag: payload.tag,
        goal: payload.goal,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  async requestItems(payload) {
    const res = await fetch(serverPath + '/requests/item', {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        link: payload.link,
        tag: payload.tag,
        items: payload.items,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      }
    });

    return Promise.resolve(res);
  },

  async markComplete(postId, service) {
    const res = await fetch(serverPath + `/requests/${service}/${postId}/complete`, {
        method: "PUT",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
    return Promise.resolve(res);
  },

}