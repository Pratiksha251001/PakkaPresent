export interface SessionScope {
  institutionId: string;
  userId: string;
}

const clean = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

export const sessionScopeKey = (scope: SessionScope) =>
  `${clean(scope.institutionId)}_${clean(scope.userId)}`;

export const scopedPathKey = (scope: SessionScope) =>
  `edutrack_last_active_path_${sessionScopeKey(scope)}`;

export const setScopedPath = (scope: SessionScope, path: string) =>
  localStorage.setItem(scopedPathKey(scope), path);

export const getScopedPath = (scope: SessionScope) =>
  localStorage.getItem(scopedPathKey(scope));

export const clearLegacySessionKeys = () => {
  for (const key of [
    "edutrack_last_active_path",
    "smit_last_active_path",
    "edutrack_last_authenticated_path",
    "smit_last_authenticated_path",
  ])
    localStorage.removeItem(key);
};
