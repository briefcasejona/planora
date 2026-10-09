import type { Lang } from '../site/dom';

interface Section {
  title: string;
  /** Paragraphs; may hold <b> and links that we wrote ourselves. */
  body: string[];
  /** Optional list under the paragraphs. */
  list?: string[];
}

interface Texts {
  pageTitle: string;
  heading: string;
  updated: string;
  summary: string;
  sections: Section[];
}

export const texts: Record<Lang, Texts> = {
  nl: {
    pageTitle: 'Privacy – Planora',
    heading: 'Privacy',
    updated: 'Laatst bijgewerkt: 9 oktober 2026',
    summary:
      'In het kort: Planora heeft geen server en geen accounts. Je taken, planning en agenda blijven op je eigen apparaat. De maker van Planora ziet en verzamelt niets van jou.',
    sections: [
      {
        title: 'Wie is verantwoordelijk?',
        body: [
          'Planora wordt gemaakt in Nederland. Vragen over privacy? Mail naar <a href="mailto:planoradevelopment@outlook.com" class="underline">planoradevelopment@outlook.com</a>.',
        ],
      },
      {
        title: 'Wat Planora op je apparaat bewaart',
        body: [
          'Alles wat je in Planora zet (taken, deadlines, planning, je antwoorden op de terugblik, instellingen) staat alleen in de opslag van je browser of de app op dat apparaat. Het gaat nergens naartoe, ook niet naar de maker van Planora.',
          'Je kunt het versleutelen met een wachtwoordzin (AES-GCM) en alles wissen via <b>Instellingen > Privacy en gegevens</b>.',
        ],
      },
      {
        title: 'Wat Planora niet doet',
        list: [
          'Geen account, geen e-mailadres, geen telefoonnummer.',
          'Geen analytics, geen trackers, geen reclame, geen cookies van derden.',
          'Geen verkoop of delen van gegevens: er zijn geen gegevens om te delen.',
        ],
        body: [],
      },
      {
        title: 'Als je zelf iets koppelt',
        body: [
          'Deze koppelingen staan standaard uit. Zet je er een aan, dan praat je apparaat <b>rechtstreeks</b> met Microsoft of Google, zonder tussenserver. Planora vraagt alleen de toestemming die nodig is:',
        ],
        list: [
          '<b>Outlook-agenda</b> (Microsoft): alleen begin, eind en bezet/vrij van je afspraken, om eromheen te plannen. De titels alleen als je <b>Ook titels van afspraken tonen</b> aanzet; ze blijven op je apparaat. Kies je ervoor, dan zet Planora je studieblokken als privé-afspraken in je eigen agenda.',
          '<b>Microsoft To Do en Teams-opdrachten</b>: namen en deadlines van je eigen taken en opdrachten, alleen om te importeren.',
          '<b>Google Agenda</b>: alleen wanneer je bezet bent (free/busy). Google geeft daarbij geen titels of details door.',
          "<b>Synchroniseren via OneDrive</b>: één bestand in Planora's eigen map in jouw OneDrive, versleuteld met een wachtwoordzin die alleen jij kent. Microsoft kan het niet lezen.",
        ],
      },
      {
        title: 'Gegevens van Google',
        body: [
          'Planora gebruikt gegevens die het van Google API\'s ontvangt alleen om je planning te maken, op je eigen apparaat. Het gebruik voldoet aan de <a href="https://developers.google.com/terms/api-services-user-data-policy" class="underline" rel="noopener">Google API Services User Data Policy</a>, inclusief de eisen voor beperkt gebruik (Limited Use). Planora geeft deze gegevens aan niemand door en gebruikt ze niet voor reclame of om AI-modellen te trainen.',
        ],
      },
      {
        title: 'Loskoppelen en wissen',
        body: [
          'Koppel je los in Planora, dan vergeet Planora de inlog en wist het alle geïmporteerde gegevens van je apparaat. Je kunt de toestemming ook intrekken bij <a href="https://myaccount.microsoft.com/" class="underline" rel="noopener">Microsoft</a> of <a href="https://myaccount.google.com/permissions" class="underline" rel="noopener">Google</a>. Met <b>Alles verwijderen</b> in Instellingen verdwijnt alles van het apparaat.',
        ],
      },
      {
        title: 'Diensten van anderen die je wel tegenkomt',
        list: [
          '<b>GitHub Pages</b> host deze website en de downloads. Zoals elke website ziet GitHub daarbij je IP-adres; zie de <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement" class="underline" rel="noopener">privacyverklaring van GitHub</a>.',
          '<b>Updates</b>: de geïnstalleerde apps (Windows, Mac, Linux, Android) vragen bij GitHub wat de nieuwste versie is. Dat kun je uitzetten in Instellingen. De website doet dit niet.',
          '<b>Een probleem melden</b>: Planora maakt een melding die je eerst ziet en zelf verstuurt, als openbare melding op GitHub (daarvoor heb je een GitHub-account nodig) of per mail. Er staan nooit taken of agendagegevens in.',
        ],
        body: [],
      },
      {
        title: 'Wijzigingen',
        body: [
          'Verandert er iets aan deze pagina, dan staat de nieuwe datum bovenaan. Eerdere versies zijn te zien in de openbare broncode op <a href="https://github.com/briefcasejona/planora" class="underline" rel="noopener">GitHub</a>.',
        ],
      },
    ],
  },
  en: {
    pageTitle: 'Privacy – Planora',
    heading: 'Privacy',
    updated: 'Last updated: 9 October 2026',
    summary:
      'In short: Planora has no server and no accounts. Your tasks, plan and calendar stay on your own device. The maker of Planora sees and collects nothing about you.',
    sections: [
      {
        title: 'Who is responsible?',
        body: [
          'Planora is made in the Netherlands. Questions about privacy? E-mail <a href="mailto:planoradevelopment@outlook.com" class="underline">planoradevelopment@outlook.com</a>.',
        ],
      },
      {
        title: 'What Planora keeps on your device',
        body: [
          'Everything you put in Planora (tasks, deadlines, plan, your review answers, settings) is stored only in your browser or the app on that device. It goes nowhere, not to the maker of Planora either.',
          'You can encrypt it with a passphrase (AES-GCM) and erase everything in <b>Settings > Privacy & data</b>.',
        ],
      },
      {
        title: "What Planora doesn't do",
        list: [
          'No account, no e-mail address, no phone number.',
          'No analytics, no trackers, no ads, no third-party cookies.',
          'No selling or sharing of data: there is no data to share.',
        ],
        body: [],
      },
      {
        title: 'When you link something yourself',
        body: [
          'These connections are off by default. If you turn one on, your device talks <b>directly</b> to Microsoft or Google, with no server in between. Planora only asks for the permission it needs:',
        ],
        list: [
          '<b>Outlook calendar</b> (Microsoft): only start, end and busy/free of your appointments, to plan around them. Titles only if you turn on <b>Also show event titles</b>; they stay on your device. If you choose, Planora puts your study blocks into your own calendar as private events.',
          '<b>Microsoft To Do and Teams assignments</b>: names and due dates of your own tasks and assignments, only to import them.',
          '<b>Google Calendar</b>: only when you are busy (free/busy). Google returns no titles or details for this.',
          "<b>Sync through OneDrive</b>: one file in Planora's own folder in your OneDrive, encrypted with a passphrase only you know. Microsoft can't read it.",
        ],
      },
      {
        title: 'Data from Google',
        body: [
          'Planora uses data it receives from Google APIs only to make your plan, on your own device. Its use adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" class="underline" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements. Planora doesn\'t pass this data to anyone and doesn\'t use it for ads or to train AI models.',
        ],
      },
      {
        title: 'Disconnecting and erasing',
        body: [
          'When you disconnect in Planora, it forgets the sign-in and deletes all imported data from your device. You can also revoke the permission at <a href="https://myaccount.microsoft.com/" class="underline" rel="noopener">Microsoft</a> or <a href="https://myaccount.google.com/permissions" class="underline" rel="noopener">Google</a>. <b>Delete everything</b> in Settings removes everything from the device.',
        ],
      },
      {
        title: 'Other services you do come across',
        list: [
          '<b>GitHub Pages</b> hosts this website and the downloads. Like any website, GitHub sees your IP address; see <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement" class="underline" rel="noopener">GitHub\'s privacy statement</a>.',
          '<b>Updates</b>: the installed apps (Windows, Mac, Linux, Android) ask GitHub what the newest version is. You can turn this off in Settings. The website does not do this.',
          '<b>Reporting a problem</b>: Planora prepares a report that you see first and send yourself, as a public report on GitHub (you need a GitHub account for that) or by e-mail. It never contains tasks or calendar data.',
        ],
        body: [],
      },
      {
        title: 'Changes',
        body: [
          'If this page changes, the new date is shown at the top. Earlier versions can be seen in the public source code on <a href="https://github.com/briefcasejona/planora" class="underline" rel="noopener">GitHub</a>.',
        ],
      },
    ],
  },
};
