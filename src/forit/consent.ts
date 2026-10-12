/**
 * Every Microsoft Graph permission Planora can ask for, in the order the page lists them. Kept apart from
 * MS_SCOPES so this page doesn't load the sign-in library; a test keeps the two lists the same.
 */
export const ALL_SCOPES = [
  'Calendars.Read',
  'Calendars.ReadWrite',
  'Tasks.Read',
  'EduAssignments.ReadBasic',
  'Files.ReadWrite.AppFolder',
];

/**
 * Microsoft's admin consent link: an administrator who opens it approves Planora for their whole
 * organisation at once ("organizations" lets Microsoft pick the admin's own tenant).
 */
export function adminConsentUrl(clientId: string, redirectUri: string, scopes: readonly string[] = ALL_SCOPES): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes.map((s) => 'https://graph.microsoft.com/' + s).join(' '),
    redirect_uri: redirectUri,
  });
  return 'https://login.microsoftonline.com/organizations/v2.0/adminconsent?' + params.toString();
}
