import type { Device } from './devices';

export type Lang = 'nl' | 'en';

interface DeviceText {
  name: string;
  intro?: string;
  /** Labels for the buttons, in the order of DOWNLOADS[device]. */
  buttons: string[];
  /** Install steps; {share} and {add} become drawings of the iPhone buttons. */
  steps: string[];
  note?: string;
}

interface Texts {
  pageTitle: string;
  heading: string;
  subheading: string;
  forYourDevice: string;
  otherDevices: string;
  openInSafari: string;
  webApp: string;
  openWebApp: string;
  syncNote: string;
  privacy: string;
  devices: Record<Device, DeviceText>;
}

export const texts: Record<Lang, Texts> = {
  nl: {
    pageTitle: 'Planora downloaden',
    heading: 'Planora downloaden',
    subheading: 'Gratis, zonder account. Je gegevens blijven op je eigen apparaat.',
    forYourDevice: 'Voor jouw apparaat',
    otherDevices: 'Andere apparaten',
    openInSafari: 'Open deze pagina in Safari: alleen Safari kan Planora op je beginscherm zetten.',
    webApp: 'Liever niets installeren? Planora werkt ook gewoon in je browser.',
    openWebApp: 'Planora openen',
    syncNote: 'Gebruik je Planora op meer apparaten? Zet dan (optioneel) synchroniseren aan via Instellingen > Synchroniseren.',
    privacy: 'Planora heeft geen server en verzamelt niets. De downloads komen rechtstreeks van GitHub.',
    devices: {
      windows: {
        name: 'Windows',
        intro: 'Voor Windows 10 en 11.',
        buttons: ['Download voor Windows', 'Versie zonder installatie (.exe)'],
        steps: [
          'Open het gedownloade bestand <b>Planora-Setup.exe</b>.',
          'Zie je een blauw venster "Windows heeft uw pc beschermd"? Klik op <b>Meer informatie</b> en dan op <b>Toch uitvoeren</b>. Dat komt doordat Planora (nog) niet betaald is ondertekend; het is eenmalig.',
          'Planora installeert zich en start meteen. Je vindt het daarna in het Startmenu en op je bureaublad.',
        ],
      },
      mac: {
        name: 'Mac',
        intro: 'Kies de versie die bij je Mac past.',
        buttons: ['Mac met Apple-chip (M1, M2, M3, M4)', 'Mac met Intel-processor'],
        steps: [
          'Weet je niet welke? Klik linksboven op het Apple-logo > <b>Over deze Mac</b>. Staat er "Chip Apple M…", kies dan Apple-chip; staat er "Processor … Intel", kies dan Intel.',
          'Open het gedownloade bestand en sleep <b>Planora</b> naar de map <b>Apps</b> (Applications).',
          'Open Planora. Zegt je Mac dat het niet geopend kan worden? Ga naar <b>Systeeminstellingen > Privacy en beveiliging</b>, scrol omlaag en klik op <b>Open toch</b>. Dat hoeft maar één keer.',
        ],
      },
      linux: {
        name: 'Linux',
        buttons: ['Download AppImage'],
        steps: [
          'Klik met rechts op <b>Planora.AppImage</b> > <b>Eigenschappen</b> en zet <b>Uitvoeren als programma toestaan</b> aan (of: <code>chmod +x Planora.AppImage</code>).',
          'Dubbelklik op het bestand om Planora te starten.',
        ],
      },
      android: {
        name: 'Android',
        intro: 'Kies de app, of zet de website op je beginscherm.',
        buttons: ['Download de app (.apk)', 'Website openen'],
        steps: [
          'Open het gedownloade bestand <b>Planora.apk</b>.',
          'Vraagt je telefoon toestemming om "onbekende apps" te installeren? Sta het toe voor je browser en tik op <b>Installeren</b>.',
          'Liever geen .apk? Open de website in Chrome, tik op het menu <b>⋮</b> en kies <b>App installeren</b> (of <b>Toevoegen aan startscherm</b>).',
        ],
        note: 'Een nieuwe versie installeer je door de nieuwe .apk op dezelfde manier te openen; je gegevens blijven bewaard.',
      },
      ios: {
        name: 'iPhone en iPad',
        intro: 'Op iPhone zet je Planora op je beginscherm, zonder App Store.',
        buttons: ['Planora openen in Safari'],
        steps: [
          'Open Planora in <b>Safari</b>.',
          'Tik onderin (of bovenin op iPad) op de deelknop {share}.',
          'Scrol en tik op <b>Zet op beginscherm</b> {add} en dan op <b>Voeg toe</b>.',
          'Open Planora voortaan met het icoon op je beginscherm: het werkt dan als een gewone app, ook offline.',
        ],
        note: 'Herinneringen verschijnen op iPhone alleen als Planora open is.',
      },
    },
  },
  en: {
    pageTitle: 'Download Planora',
    heading: 'Download Planora',
    subheading: 'Free, no account. Your data stays on your own device.',
    forYourDevice: 'For your device',
    otherDevices: 'Other devices',
    openInSafari: 'Open this page in Safari: only Safari can add Planora to your home screen.',
    webApp: "Rather not install anything? Planora also works right in your browser.",
    openWebApp: 'Open Planora',
    syncNote: 'Using Planora on more than one device? You can (optionally) turn on sync in Settings > Sync.',
    privacy: 'Planora has no server and collects nothing. Downloads come straight from GitHub.',
    devices: {
      windows: {
        name: 'Windows',
        intro: 'For Windows 10 and 11.',
        buttons: ['Download for Windows', 'Version without installing (.exe)'],
        steps: [
          'Open the downloaded file <b>Planora-Setup.exe</b>.',
          'See a blue "Windows protected your PC" window? Click <b>More info</b>, then <b>Run anyway</b>. This is because Planora is not (yet) signed with a paid certificate; you only see it once.',
          'Planora installs and starts right away. Afterwards you find it in the Start menu and on your desktop.',
        ],
      },
      mac: {
        name: 'Mac',
        intro: 'Choose the version that fits your Mac.',
        buttons: ['Mac with Apple chip (M1, M2, M3, M4)', 'Mac with Intel processor'],
        steps: [
          'Not sure which? Click the Apple logo (top left) > <b>About This Mac</b>. "Chip Apple M…" means Apple chip; "Processor … Intel" means Intel.',
          'Open the downloaded file and drag <b>Planora</b> into <b>Applications</b>.',
          'Open Planora. If your Mac says it can\'t be opened, go to <b>System Settings > Privacy & Security</b>, scroll down and click <b>Open Anyway</b>. You only need to do this once.',
        ],
      },
      linux: {
        name: 'Linux',
        buttons: ['Download AppImage'],
        steps: [
          'Right-click <b>Planora.AppImage</b> > <b>Properties</b> and turn on <b>Allow executing as program</b> (or: <code>chmod +x Planora.AppImage</code>).',
          'Double-click the file to start Planora.',
        ],
      },
      android: {
        name: 'Android',
        intro: 'Choose the app, or add the website to your home screen.',
        buttons: ['Download the app (.apk)', 'Open the website'],
        steps: [
          'Open the downloaded file <b>Planora.apk</b>.',
          'If your phone asks permission to install "unknown apps", allow it for your browser and tap <b>Install</b>.',
          'Rather not use an .apk? Open the website in Chrome, tap the <b>⋮</b> menu and choose <b>Install app</b> (or <b>Add to Home screen</b>).',
        ],
        note: 'To update, open a newer .apk the same way; your data is kept.',
      },
      ios: {
        name: 'iPhone and iPad',
        intro: 'On iPhone you add Planora to your home screen, no App Store needed.',
        buttons: ['Open Planora in Safari'],
        steps: [
          'Open Planora in <b>Safari</b>.',
          'Tap the share button {share} at the bottom (top on iPad).',
          'Scroll and tap <b>Add to Home Screen</b> {add}, then <b>Add</b>.',
          'From now on open Planora with the icon on your home screen: it works like a normal app, also offline.',
        ],
        note: 'On iPhone, reminders only appear while Planora is open.',
      },
    },
  },
};
