import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
  timeout: 20000
});

const getApiError = (err) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK") return "Backend is not reachable. Please check backend server/tunnel.";
  return err?.message || "Unable to complete request. Please try again.";
};

export const AuthProvider = ({ children }) => {
  const authContext = useContext(AuthContext);
  const [userData, setUserData] = useState(authContext);
  const router = useNavigate();

  const handleRegister = async (name, username, password) => {
    try {
      const request = await client.post("/register", { name, username, password });
      if (request.status === httpStatus.CREATED) return request.data.message || "Account created successfully. Please login.";
      return "Account created successfully. Please login.";
    } catch (err) {
      throw new Error(getApiError(err));
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const request = await client.post("/login", { username, password });
      if (request.status === httpStatus.OK) {
        localStorage.setItem("token", request.data.token);
        localStorage.setItem("user", JSON.stringify(request.data.user || {}));
        setUserData(request.data.user || {});
        router("/home");
      }
    } catch (err) {
      throw new Error(getApiError(err));
    }
  };

  const getHistoryOfUser = async () => {
    try {
      const request = await client.get("/get_all_activity", { params: { token: localStorage.getItem("token") } });
      return request.data;
    } catch (err) {
      throw new Error(getApiError(err));
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      const request = await client.post("/add_to_activity", { token: localStorage.getItem("token"), meeting_code: meetingCode });
      return request.data;
    } catch (err) {
      throw new Error(getApiError(err));
    }
  };

  const data = { userData, setUserData, addToUserHistory, getHistoryOfUser, handleRegister, handleLogin };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
