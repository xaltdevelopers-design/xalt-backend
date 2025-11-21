import { getRoles } from "../controllers/roles.ts";

/**
 * Checks if a user has a specific permission.
 * @param userRoles Array of role names assigned to the user
 * @param permission The permission string to check
 * @returns true if user has permission (superAdmin always true)
 */
export async function hasPermission(userRoles: string[], permission: string): Promise<boolean> {
  if (userRoles.includes("superAdmin")) return true;
  const allRoles = await getRoles();
  for (const roleName of userRoles) {
    const role = allRoles.find((r: any) => r.name === roleName);
    if (role && Array.isArray(role.permissions) && role.permissions.includes(permission)) {
      return true;
    }
  }
  return false;
}
