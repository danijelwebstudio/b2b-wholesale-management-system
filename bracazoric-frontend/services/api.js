import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config";

export async function getCurrentUser() {
  const userString = await AsyncStorage.getItem("currentUser");
  if (!userString) return null;

  try {
    return JSON.parse(userString);
  } catch {
    return null;
  }
}

export async function getAuthToken() {
  return AsyncStorage.getItem("authToken");
}

export async function clearSession() {
  await AsyncStorage.multiRemove(["currentUser", "authToken"]);
}

export async function apiRequest(path, options = {}) {
  const token = await getAuthToken();

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("Nije moguće povezati se sa serverom.");
  }

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || data?.error || `Greška servera (${response.status})`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// TRGOVINA
export async function getRacuni() {
  return apiRequest("/racuni/moji");
}

export async function createOrder(payload) {
  return apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// FIRMA
export async function getSviRacuni() {
  return apiRequest("/racuni");
}

export async function getOrders() {
  return apiRequest("/orders");
}

export async function getTrgovine() {
  return apiRequest("/auth/trgovine");
}

export async function createRacun(payload) {
  return apiRequest("/racuni", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTransakcije() {
  return apiRequest("/transakcije");
}

export async function primijeniTransakciju(payload) {
  return apiRequest("/transakcije/primijeni", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
