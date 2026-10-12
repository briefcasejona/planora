import type { Lang } from '../site/dom';

interface Permission {
  scope: string;
  feature: string;
  when: string;
}

interface Texts {
  pageTitle: string;
  title: string;
  intro: string;
  factsTitle: string;
  facts: string[];
  permissionsTitle: string;
  permissionsIntro: string;
  permissionHeads: [string, string, string];
  permissions: Permission[];
  signInNote: string;
  approveTitle: string;
  approveIntro: string;
  approveLink: string;
  approveNoId: string;
  approveSteps: string[];
  clientIdLabel: string;
  limitTitle: string;
  limit: string[];
  verifyTitle: string;
  verify: string;
  contactTitle: string;
  contact: string;
}

const CONTACT = 'mailto:planoradevelopment@outlook.com';
const SOURCE = 'https://github.com/briefcasejona/planora';

export const texts: Record<Lang, Texts> = {
  en: {
    pageTitle: 'Planora for IT administrators',
    title: 'Planora for IT administrators',
    intro:
      'Planora is a free study planner. This page is for the people who decide whether students and staff may connect it to their Microsoft 365 account: what it asks for, where the data goes, and how to approve it for everyone at once.',
    factsTitle: 'In short',
    facts: [
      '<b>No server, no account.</b> Planora runs entirely on the user’s own device (browser, desktop app or Android app). There is no Planora server, so your organisation’s data never reaches the makers of Planora.',
      '<b>Delegated permissions only.</b> Planora reads with the signed-in user’s own rights. Each person sees only their own calendar and assignments, never anyone else’s.',
      '<b>Asked for per feature.</b> Every permission is requested only when the user turns that feature on. Reading the calendar and assignments needs nothing that changes data.',
      '<b>Tokens stay on the device.</b> Microsoft Graph is called directly from the device. Nothing is tracked, and logs hold counts only, never titles or content.',
      '<b>Open source.</b> The code is public on <a href="' +
        SOURCE +
        '" class="underline" rel="noopener">GitHub</a>, including exactly which permissions it asks for.',
    ],
    permissionsTitle: 'Microsoft Graph permissions',
    permissionsIntro: 'All delegated. For the college use case, the first and the fourth are the ones that matter.',
    permissionHeads: ['Permission', 'What Planora uses it for', 'When it is asked for'],
    permissions: [
      {
        scope: 'Calendars.Read',
        feature: 'See when the user has classes and appointments, so study time is planned around them.',
        when: 'When the user connects Outlook (on by default after connecting).',
      },
      {
        scope: 'Calendars.ReadWrite',
        feature: 'Optional: put the planned study blocks in the user’s own calendar as private events.',
        when: 'Only if the user turns on “Write sessions to Outlook” (off by default).',
      },
      {
        scope: 'Tasks.Read',
        feature: 'Optional: import tasks from Microsoft To Do.',
        when: 'Only if the user turns on the To Do import.',
      },
      {
        scope: 'EduAssignments.ReadBasic',
        feature: 'Import the user’s Teams assignments with their due dates, so deadlines become planned tasks.',
        when: 'Only if the user turns on the Teams import. Needs admin consent.',
      },
      {
        scope: 'Files.ReadWrite.AppFolder',
        feature:
          'Optional: sync between the user’s own devices through Planora’s own folder in their OneDrive (Apps/Planora), end-to-end encrypted. No access to their other files.',
        when: 'Only if the user turns on sync.',
      },
    ],
    signInNote:
      'Sign-in also uses the standard openid, profile and offline_access permissions, so the user stays signed in on their own device.',
    approveTitle: 'Approve Planora for your whole organisation',
    approveIntro:
      'An administrator approves Planora once; after that every user in your Microsoft 365 organisation can connect without being asked for approval. Other organisations are not affected.',
    approveLink: 'Open Microsoft’s approval screen',
    approveNoId: 'The approval link is not available in this copy of the page.',
    approveSteps: [
      'Sign in with an account that may grant tenant-wide consent (for example Global Administrator, Privileged Role Administrator or Cloud Application Administrator).',
      'Microsoft shows the permissions above. Approve them for your organisation.',
      'Alternatively, in the Microsoft Entra admin center: Enterprise applications > Planora (search for the application ID below) > Permissions > “Grant admin consent”.',
    ],
    clientIdLabel: 'Application (client) ID',
    limitTitle: 'Keeping control',
    limit: [
      'Limit Planora to certain users or groups: Enterprise applications > Planora > Properties > “Assignment required” = Yes, then assign the groups.',
      'Withdraw the approval at any time by removing Planora under Enterprise applications. Users can also remove it themselves at myaccount.microsoft.com > Apps.',
    ],
    verifyTitle: 'Publisher',
    verify:
      'Planora is made by an independent developer in the Netherlands and is not yet a Microsoft-verified publisher, so Microsoft may show it as “unverified”. You can review the source code and the <a href="legal/privacy.html" class="underline">privacy policy</a> before approving.',
    contactTitle: 'Questions',
    contact:
      'Questions about security or privacy? Mail <a href="' +
      CONTACT +
      '" class="underline">planoradevelopment@outlook.com</a>.',
  },
  nl: {
    pageTitle: 'Planora voor IT-beheerders',
    title: 'Planora voor IT-beheerders',
    intro:
      'Planora is een gratis studieplanner. Deze pagina is voor wie beslist of studenten en medewerkers het aan hun Microsoft 365-account mogen koppelen: wat het vraagt, waar de gegevens heen gaan en hoe je het in één keer voor iedereen goedkeurt.',
    factsTitle: 'In het kort',
    facts: [
      '<b>Geen server, geen account.</b> Planora draait helemaal op het eigen apparaat van de gebruiker (browser, desktop-app of Android-app). Er is geen Planora-server, dus gegevens van jullie organisatie komen nooit bij de makers van Planora.',
      '<b>Alleen gedelegeerde rechten.</b> Planora leest met de rechten van de ingelogde gebruiker zelf. Iedereen ziet alleen zijn eigen agenda en opdrachten, nooit die van een ander.',
      '<b>Per functie gevraagd.</b> Elk recht wordt pas gevraagd als de gebruiker die functie aanzet. Voor het lezen van agenda en opdrachten is niets nodig dat gegevens verandert.',
      '<b>Tokens blijven op het apparaat.</b> Microsoft Graph wordt rechtstreeks vanaf het apparaat aangeroepen. Er wordt niets gevolgd, en logboeken bevatten alleen aantallen, nooit titels of inhoud.',
      '<b>Open broncode.</b> De code staat openbaar op <a href="' +
        SOURCE +
        '" class="underline" rel="noopener">GitHub</a>, inclusief precies welke rechten Planora vraagt.',
    ],
    permissionsTitle: 'Microsoft Graph-rechten',
    permissionsIntro: 'Allemaal gedelegeerd. Voor gebruik op een hogeschool gaat het vooral om de eerste en de vierde.',
    permissionHeads: ['Recht', 'Waarvoor Planora het gebruikt', 'Wanneer het gevraagd wordt'],
    permissions: [
      {
        scope: 'Calendars.Read',
        feature: 'Zien wanneer de gebruiker les en afspraken heeft, zodat studietijd eromheen gepland wordt.',
        when: 'Als de gebruiker Outlook koppelt (staat dan standaard aan).',
      },
      {
        scope: 'Calendars.ReadWrite',
        feature: 'Optioneel: de geplande studieblokken als privé-afspraken in de eigen agenda zetten.',
        when: 'Alleen als de gebruiker “Studieblokken in Outlook zetten” aanzet (standaard uit).',
      },
      {
        scope: 'Tasks.Read',
        feature: 'Optioneel: taken uit Microsoft To Do importeren.',
        when: 'Alleen als de gebruiker de To Do-import aanzet.',
      },
      {
        scope: 'EduAssignments.ReadBasic',
        feature:
          'De Teams-opdrachten van de gebruiker met hun inleverdatum importeren, zodat deadlines geplande taken worden.',
        when: 'Alleen als de gebruiker de Teams-import aanzet. Vraagt toestemming van een beheerder.',
      },
      {
        scope: 'Files.ReadWrite.AppFolder',
        feature:
          'Optioneel: synchroniseren tussen de eigen apparaten via Planora’s eigen map in OneDrive (Apps/Planora), end-to-end versleuteld. Geen toegang tot andere bestanden.',
        when: 'Alleen als de gebruiker synchroniseren aanzet.',
      },
    ],
    signInNote:
      'Inloggen gebruikt daarnaast de standaardrechten openid, profile en offline_access, zodat de gebruiker op zijn eigen apparaat ingelogd blijft.',
    approveTitle: 'Planora goedkeuren voor de hele organisatie',
    approveIntro:
      'Een beheerder keurt Planora één keer goed; daarna kan iedereen in jullie Microsoft 365-organisatie koppelen zonder om goedkeuring te hoeven vragen. Andere organisaties merken daar niets van.',
    approveLink: 'Goedkeuringsscherm van Microsoft openen',
    approveNoId: 'De goedkeuringslink is niet beschikbaar in deze versie van de pagina.',
    approveSteps: [
      'Log in met een account dat toestemming voor de hele organisatie mag geven (bijvoorbeeld Globale beheerder, Beheerder met bevoorrechte rol of Cloudtoepassingsbeheerder).',
      'Microsoft toont de rechten hierboven. Keur ze goed voor jullie organisatie.',
      'Of in het Microsoft Entra-beheercentrum: Bedrijfstoepassingen > Planora (zoek op de toepassings-ID hieronder) > Machtigingen > “Beheerderstoestemming verlenen”.',
    ],
    clientIdLabel: 'Toepassings-ID (client-ID)',
    limitTitle: 'Zelf de controle houden',
    limit: [
      'Planora beperken tot bepaalde gebruikers of groepen: Bedrijfstoepassingen > Planora > Eigenschappen > “Toewijzing vereist” = Ja, en wijs daarna de groepen toe.',
      'De goedkeuring kan altijd worden ingetrokken door Planora te verwijderen onder Bedrijfstoepassingen. Gebruikers kunnen het ook zelf verwijderen via myaccount.microsoft.com > Apps.',
    ],
    verifyTitle: 'Uitgever',
    verify:
      'Planora wordt gemaakt door een zelfstandige ontwikkelaar in Nederland en is nog geen door Microsoft geverifieerde uitgever, dus Microsoft kan het als “niet geverifieerd” tonen. Je kunt de broncode en de <a href="legal/privacy.nl.html" class="underline">privacyverklaring</a> bekijken voordat je goedkeurt.',
    contactTitle: 'Vragen',
    contact:
      'Vragen over beveiliging of privacy? Mail naar <a href="' +
      CONTACT +
      '" class="underline">planoradevelopment@outlook.com</a>.',
  },
};
