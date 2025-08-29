// A tiny interface both LocalAuth and Auth0Auth will implement.
export class AuthAdapter {
  async registerOrgAndAdmin(args) { 
    throw new Error("registerOrgAndAdmin not implemented"); 
  }
  
  async login(args) { 
    throw new Error("login not implemented"); 
  }
  
  async verifyRequest(req) { 
    throw new Error("verifyRequest not implemented"); // returns {user, tokenJti?}
  }
  
  setCookie(res, token) { 
    throw new Error("setCookie not implemented"); 
  }
  
  clearCookie(res) { 
    throw new Error("clearCookie not implemented"); 
  }
  
  async logout(args) {
    throw new Error("logout not implemented");
  }
}
