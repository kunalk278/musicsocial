import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ??
  "http://localhost:3000";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("bandwagon_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Concert {
  id: string;
  bandName: string;
  date: string;
  venue: string | null;
  city: string | null;
  startTime: string | null;
  ticketUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  imageUrl: string | null;
  status: "INTERESTED" | "ATTENDING";
  externalId: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  shareToken: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: string;
  followee: { id: string; name: string; city: string; shareToken: string };
}

export interface FeedItem {
  id: string;
  bandName: string;
  date: string;
  venue: string | null;
  city: string | null;
  status: "INTERESTED" | "ATTENDING";
  user: { id: string; name: string; shareToken: string };
}

export interface LookupResult {
  events: Array<{
    id: string;
    name: string;
    date: string;
    venue: string;
    city: string;
    startTime: string | null;
    ticketUrl: string | null;
    priceMin: number | null;
    priceMax: number | null;
    imageUrl: string | null;
    source: string;
  }>;
  errors: string[];
}

export const api = {
  auth: {
    signIn: (email: string, password: string) =>
      request<{ token: string; user: User }>("/api/mobile/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    signUp: (name: string, email: string, password: string, city: string) =>
      request<{ token: string; user: User }>("/api/mobile/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password, city }),
      }),
  },
  me: {
    get: () => request<User>("/api/me"),
  },
  concerts: {
    list: () => request<Concert[]>("/api/concerts"),
    create: (data: Omit<Concert, "id" | "createdAt">) =>
      request<Concert>("/api/concerts", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>("/api/concerts", { method: "DELETE", body: JSON.stringify({ id }) }),
    lookup: (bandName: string, city: string) =>
      request<LookupResult>(`/api/concerts/lookup?bandName=${encodeURIComponent(bandName)}&city=${encodeURIComponent(city)}`),
    suggest: (q: string) =>
      request<{ attractions: Array<{ id: string; name: string; imageUrl: string | null }> }>(
        `/api/concerts/suggest?q=${encodeURIComponent(q)}`
      ),
  },
  follows: {
    list: () => request<Follow[]>("/api/follows"),
    follow: (shareToken: string) =>
      request<Follow>("/api/follows", { method: "POST", body: JSON.stringify({ shareToken }) }),
    unfollow: (followeeId: string) =>
      request<{ success: boolean }>("/api/follows", { method: "DELETE", body: JSON.stringify({ followeeId }) }),
  },
  feed: {
    get: () => request<FeedItem[]>("/api/feed"),
  },
};
