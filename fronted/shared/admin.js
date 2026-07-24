import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

const functions = getFunctions();

export const createUserByAdmin = async ({ email, password, displayName, role }) => {
  const callable = httpsCallable(functions, "createUserByAdmin");
  const result = await callable({ email, password, displayName, role });
  return result.data;
};

export const setUserPasswordByAdmin = async ({ uid, password }) => {
  const callable = httpsCallable(functions, "setUserPasswordByAdmin");
  const result = await callable({ uid, password });
  return result.data;
};

export const setUserRoleByAdmin = async ({ uid, role, superAdmin }) => {
  const callable = httpsCallable(functions, "setUserRoleByAdmin");
  const result = await callable({ uid, role, superAdmin });
  return result.data;
};
