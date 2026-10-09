import type { Lang } from '../site/dom';

interface Section {
  title: string;
  text: string;
}

interface Texts {
  pageTitle: string;
  tagline: string;
  intro: string;
  openApp: string;
  download: string;
  noAccount: string;
  howTitle: string;
  how: string[];
  featuresTitle: string;
  features: Section[];
  forWhoTitle: string;
  forWho: Section[];
  whyTitle: string;
  why: Section[];
  faqTitle: string;
  faq: { q: string; a: string }[];
  madeByTitle: string;
  madeBy: string;
}

export const texts: Record<Lang, Texts> = {
  nl: {
    pageTitle: 'Planora: je huiswerk, slim gepland',
    tagline: 'Zeg wat je moet doen. Planora zegt wanneer.',
    intro:
      'Planora is een gratis planner voor scholieren, studenten en docenten. Je zet je toetsen, opdrachten en taken erin, en Planora plant de momenten om eraan te werken, ruim voor de deadline en om je lessen en afspraken heen.',
    openApp: 'Planora openen',
    download: 'Downloaden',
    noAccount: 'Werkt meteen in je browser. Geen account, geen e-mailadres nodig.',
    howTitle: 'Zo werkt het',
    how: [
      '<b>Zet erin wat je moet doen</b>: een toets, opdracht of project, met de deadline en hoe lang je denkt dat het duurt.',
      '<b>Planora plant het in</b>: kleine blokken verdeeld over de dagen ervoor, rond je rooster, sport of bijbaan.',
      '<b>Vink af en vertel hoe het ging</b>: Planora leert hoeveel tijd jij echt nodig hebt, zodat de volgende planning beter klopt.',
    ],
    featuresTitle: 'Wat Planora kan',
    features: [
      {
        title: 'Slim leren voor toetsen',
        text: 'Leermomenten die dichter op elkaar komen naarmate de toets nadert, met een korte herhaling de dag ervoor.',
      },
      {
        title: 'Projecten in stappen',
        text: 'Een groot project wordt opgedeeld in stappen, elk met een eigen tussendeadline.',
      },
      {
        title: 'Past het niet? Dan hoor je het',
        text: 'Planora waarschuwt als het werk niet meer past, in plaats van je dagen stilletjes vol te proppen.',
      },
      {
        title: 'Week vergeten? Geen probleem',
        text: 'Gemiste blokken worden vanzelf opnieuw ingepland.',
      },
      {
        title: 'Weekplan en terugblik',
        text: 'Op zondag een plan voor de week, op zaterdag een terugblik: wat ging goed, wat kan beter.',
      },
      {
        title: 'Je eigen agenda erbij',
        text: 'Optioneel: Outlook en Teams, Google Agenda of Apple Agenda, zodat Planora om je afspraken heen plant.',
      },
    ],
    forWhoTitle: 'Voor wie?',
    forWho: [
      {
        title: 'Scholieren en studenten',
        text: 'Voor iedereen die vaak op het laatste moment begint, of niet weet waar te beginnen als alles tegelijk komt, zoals in de toetsweek.',
      },
      {
        title: 'Docenten',
        text: 'Plan nakijkwerk en lesvoorbereiding rond je lesrooster. Je kunt Planora ook aanraden aan je klas: iedereen gebruikt het met zijn eigen gegevens.',
      },
    ],
    whyTitle: 'Waarom Planora?',
    why: [
      {
        title: 'Je gegevens blijven bij jou',
        text: 'Planora heeft geen server en geen account. Alles staat op je eigen apparaat. Geen reclame, geen tracking.',
      },
      {
        title: 'Het leert van jou',
        text: 'Duurt biologie bij jou altijd langer? Dan plant Planora daar voortaan meer tijd voor, en vertelt waarom.',
      },
      {
        title: 'Gratis, op elk apparaat',
        text: 'Windows, Mac, Linux, Android, iPhone of gewoon in de browser. In het Nederlands en Engels.',
      },
    ],
    faqTitle: 'Vragen',
    faq: [
      {
        q: 'Is Planora gratis?',
        a: 'Ja. Er is geen betaalde versie en er is geen reclame.',
      },
      {
        q: 'Waar staan mijn gegevens?',
        a: 'Alleen op je eigen apparaat, in de browser of de app. Er is geen Planora-server waar ze naartoe gaan. Lees meer op de <a href="privacy.html" class="underline">privacypagina</a>.',
      },
      {
        q: 'Wat als ik mijn browsergegevens wis of een nieuw apparaat krijg?',
        a: 'Dan ben je je planning kwijt, omdat die alleen op dat apparaat staat. Maak daarom af en toe een back-up (Instellingen > Privacy en gegevens > Back-up), of zet synchroniseren aan via je eigen OneDrive.',
      },
      {
        q: 'Kan ik Planora op mijn telefoon én laptop gebruiken?',
        a: 'Ja. Met synchroniseren (optioneel) komen je taken op al je apparaten, versleuteld via je eigen OneDrive. Niemand anders kan ze lezen, ook Microsoft niet.',
      },
      {
        q: 'Kan mijn docent of school zien wat ik plan?',
        a: 'Nee. Planora deelt niets met anderen. Ook als je je schoolaccount koppelt, leest Planora alleen je agenda; het schrijft niets naar anderen.',
      },
      {
        q: 'Mijn computer waarschuwt bij het installeren. Is het veilig?',
        a: 'Windows en Mac waarschuwen bij apps die niet met een betaald certificaat zijn ondertekend. Planora is dat (nog) niet. De downloads komen rechtstreeks van GitHub, waar ook de broncode staat. Liever niets installeren? Gebruik dan de webversie.',
      },
      {
        q: 'Werkt het zonder internet?',
        a: 'Ja. Na de eerste keer openen werkt Planora ook offline.',
      },
    ],
    madeByTitle: 'Wie maakt Planora?',
    madeBy:
      'Planora wordt gemaakt in Nederland. De broncode is openbaar op <a href="https://github.com/briefcasejona/planora" class="underline" rel="noopener">GitHub</a>. Vragen of een probleem? Mail naar <a href="mailto:planoradevelopment@outlook.com" class="underline">planoradevelopment@outlook.com</a>.',
  },
  en: {
    pageTitle: 'Planora: your schoolwork, planned for you',
    tagline: "Tell Planora what's due. It tells you when to do it.",
    intro:
      'Planora is a free planner for students and teachers. Add your tests, assignments and tasks, and Planora plans when to work on them, well before the deadline and around your classes and appointments.',
    openApp: 'Open Planora',
    download: 'Download',
    noAccount: 'Works right away in your browser. No account, no e-mail address needed.',
    howTitle: 'How it works',
    how: [
      "<b>Add what's due</b>: a test, assignment or project, with its deadline and how long you think it takes.",
      '<b>Planora plans it</b>: small blocks spread over the days before, around your timetable, sports or job.',
      '<b>Check it off and say how it went</b>: Planora learns how much time you really need, so the next plan fits better.',
    ],
    featuresTitle: 'What Planora does',
    features: [
      {
        title: 'Smart test revision',
        text: 'Study sessions that get closer together as the test nears, with a short review the day before.',
      },
      {
        title: 'Projects in steps',
        text: 'A big project is split into steps, each with its own deadline.',
      },
      {
        title: "Doesn't fit? You'll know",
        text: 'Planora warns you when the work no longer fits, instead of quietly overfilling your days.',
      },
      {
        title: 'Missed a block? No problem',
        text: 'Missed work is planned again automatically.',
      },
      {
        title: 'Weekly plan and review',
        text: 'A plan for the week on Sunday, a review on Saturday: what went well, what could be better.',
      },
      {
        title: 'Your own calendar',
        text: 'Optional: Outlook and Teams, Google Calendar or Apple Calendar, so Planora plans around your appointments.',
      },
    ],
    forWhoTitle: 'Who is it for?',
    forWho: [
      {
        title: 'Students',
        text: "For anyone who often starts at the last minute, or doesn't know where to begin when everything is due at once, like in exam week.",
      },
      {
        title: 'Teachers',
        text: 'Plan grading and lesson prep around your timetable. You can also recommend Planora to your class: everyone uses it with their own data.',
      },
    ],
    whyTitle: 'Why Planora?',
    why: [
      {
        title: 'Your data stays with you',
        text: 'Planora has no server and no account. Everything is on your own device. No ads, no tracking.',
      },
      {
        title: 'It learns from you',
        text: 'Does Biology always take you longer? Then Planora plans more time for it from now on, and tells you why.',
      },
      {
        title: 'Free, on every device',
        text: 'Windows, Mac, Linux, Android, iPhone or just in your browser. In English and Dutch.',
      },
    ],
    faqTitle: 'Questions',
    faq: [
      {
        q: 'Is Planora free?',
        a: 'Yes. There is no paid version and there are no ads.',
      },
      {
        q: 'Where is my data?',
        a: 'Only on your own device, in the browser or the app. There is no Planora server it goes to. Read more on the <a href="privacy.html" class="underline">privacy page</a>.',
      },
      {
        q: 'What if I clear my browser data or get a new device?',
        a: 'Then your plan is gone, because it only lives on that device. So make a backup now and then (Settings > Privacy & data > Backup), or turn on sync through your own OneDrive.',
      },
      {
        q: 'Can I use Planora on my phone and my laptop?',
        a: 'Yes. With sync (optional) your tasks appear on all your devices, encrypted through your own OneDrive. Nobody else can read them, not even Microsoft.',
      },
      {
        q: 'Can my teacher or school see what I plan?',
        a: 'No. Planora shares nothing with anyone. Even if you link your school account, Planora only reads your calendar; it never writes to other people.',
      },
      {
        q: 'My computer shows a warning when installing. Is it safe?',
        a: 'Windows and Mac warn about apps that are not signed with a paid certificate. Planora is not (yet). The downloads come straight from GitHub, where the source code is too. Rather not install anything? Use the web version.',
      },
      {
        q: 'Does it work without internet?',
        a: 'Yes. After you open it once, Planora also works offline.',
      },
    ],
    madeByTitle: 'Who makes Planora?',
    madeBy:
      'Planora is made in the Netherlands. The source code is public on <a href="https://github.com/briefcasejona/planora" class="underline" rel="noopener">GitHub</a>. Questions or a problem? E-mail <a href="mailto:planoradevelopment@outlook.com" class="underline">planoradevelopment@outlook.com</a>.',
  },
};
