const TOKEN_KEY = 'lost_found_token';
const USER_INFO_KEY = 'lost_found_user_info';

export type UserInfo = Record<string, unknown>;

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setUserInfo = (userInfo: UserInfo) => {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
};

export const getUserInfo = <T extends UserInfo = UserInfo>(): T | null => {
  const rawUserInfo = localStorage.getItem(USER_INFO_KEY);

  if (!rawUserInfo) {
    return null;
  }

  try {
    return JSON.parse(rawUserInfo) as T;
  } catch {
    removeUserInfo();
    return null;
  }
};

export const removeUserInfo = () => {
  localStorage.removeItem(USER_INFO_KEY);
};

export const clearAuthStorage = () => {
  removeToken();
  removeUserInfo();
};
