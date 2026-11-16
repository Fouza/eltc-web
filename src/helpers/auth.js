import Cookies from 'universal-cookie';

const cookies = new Cookies(null, { path: '/' });
const TOKEN_COOKIE = 'eltc_user_accesstoken';

export const getToken = () => cookies.get(TOKEN_COOKIE) ?? null;
export const setToken = (token) => cookies.set(TOKEN_COOKIE, token, { path: '/', sameSite: 'strict', secure: location.protocol === 'https:', maxAge: 60 * 60 * 12 });
export const clearToken = () => cookies.remove(TOKEN_COOKIE, { path: '/' });

export const hasRole = (user, roles = []) => !roles.length || Boolean(user?.roles?.some((r) => roles.includes(r)));
