export function findLongestMatch(currentPath: string, allPaths: string[]): string | null {
  const matchingPaths = allPaths.filter(path => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  });
  if (matchingPaths.length === 0) return null;
  matchingPaths.sort((a, b) => b.length - a.length);
  return matchingPaths[0];
}
