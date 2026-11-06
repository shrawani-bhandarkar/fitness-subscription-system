export function isAdministratorRole(role) {
  return role === "ADMIN";
}

export function isMemberRole(role) {
  return role === "MEMBER" || role === "USER";
}

export function getAuthenticatedHomePath(userId, adminClerkUserId) {
  const configuredAdminId = adminClerkUserId?.trim();
  return configuredAdminId && userId === configuredAdminId
    ? "/admin/dashboard"
    : "/dashboard";
}
