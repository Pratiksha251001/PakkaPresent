const KEY = "pakkapresent_platform_path";
export const getPlatformPath = () => sessionStorage.getItem(KEY);
export const setPlatformPath = (path: string) => {
  if (path.startsWith("/platform/") && path !== "/platform/login")
    sessionStorage.setItem(KEY, path);
};
export const clearPlatformPath = () => sessionStorage.removeItem(KEY);
