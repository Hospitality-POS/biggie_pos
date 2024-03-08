function SetBearerHeaderToken() {
    const userJSON = localStorage.getItem("user");
    let token = "";

    if (userJSON) {
      const userObject = JSON.parse(userJSON);
      token = userObject.Token;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };
  return {headers}
}

export default SetBearerHeaderToken