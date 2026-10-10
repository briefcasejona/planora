# Privacyverklaring — Planora

*Laatst bijgewerkt: 10 oktober 2026 · Versie 0.3.4*

Planora is een plan-app voor leerlingen, studenten en docenten, gemaakt door Jonathan, Nederland ("ik", "mij"). Planora werkt als website, desktop-app (Windows, Mac, Linux), Android-app en beginschermapp op iPhone/iPad. Vragen of verzoeken: **planoradevelopment@outlook.com**.

## In het kort

- Je taken, planning, feedback en instellingen staan **alleen op je eigen apparaat**. Planora heeft geen server en geen Planora-accounts. Ik kan je gegevens niet zien.
- Geen advertenties, geen analytics, geen trackers.
- Microsoft (Outlook, To Do, Teams, OneDrive) of Google Agenda koppelen is **optioneel**. Doe je dat, dan praat je apparaat **rechtstreeks** met Microsoft of Google; de gegevens gaan niet via mij.
- Een paar dingen gaan wel via anderen: de website en downloads staan bij GitHub, de apps vragen GitHub naar updates, en als je een fout meldt, ontvang ik wat je stuurt.

## Wat er met je gegevens gebeurt

| Gegevens | Waar opgeslagen | Waarom | Grondslag (AVG) |
|---|---|---|---|
| Taken, geplande momenten, feedback, eigen agenda-items, instellingen, geleerde tijdsinschattingen | Alleen op je apparaat (browser-/app-opslag). Optioneel versleuteld met je wachtwoordzin. | Om je werk te plannen — de kern van de app. | Je verwerkt deze gegevens zelf op je eigen apparaat; ik ontvang ze niet. |
| Back-ups | Een bestand dat je zelf downloadt en bewaart; altijd versleuteld met een wachtwoordzin die jij kiest. | Om je gegevens te kunnen terugzetten. | Zie hierboven. |
| Activiteitenlog | Op je apparaat; alleen aantallen (bijv. "3 afspraken geïmporteerd"), nooit inhoud. | Om te laten zien wanneer Planora contact had met Microsoft of Google. | Zie hierboven. |
| Inloggegevens (tokens) van Microsoft/Google | Op je apparaat (voor de browsersessie, of langer als je ingelogd blijft of synchroniseert). | Om de koppelingen te gebruiken die je aanzet. | Zie hierboven. |
| Foutmeldingen die je per e-mail stuurt | Mijn mailbox (Outlook.com, Microsoft). | Om het probleem op te lossen en je te antwoorden. | Gerechtvaardigd belang bij het verbeteren van de app en je antwoorden (art. 6 lid 1 sub f). |
| Bezoek aan website en downloads, updatecontroles | Servers van GitHub (logs met IP-adres en browser-/app-gegevens). | Om de website, downloads en update-informatie te leveren. | Gerechtvaardigd belang bij het veilig aanbieden van de app (art. 6 lid 1 sub f). |

## Optionele koppelingen

Je kiest per functie wat Planora mag. Planora vraagt Microsoft of Google alleen om de toestemming die die functie nodig heeft.

### Microsoft (Outlook, Teams, To Do, OneDrive)
Je logt in bij Microsoft met je persoonlijke of school-/werkaccount. Afhankelijk van wat je aanzet:

| Functie | Toestemming | Wat Planora doet |
|---|---|---|
| Bezette tijden uit Outlook (incl. Teams-vergaderingen) | Calendars.Read | Leest je agenda om om je afspraken heen te plannen. |
| Geplande momenten in Outlook zetten | Calendars.ReadWrite | Maakt, verplaatst en verwijdert **alleen afspraken die Planora zelf heeft gemaakt**, gemarkeerd als privé. |
| Microsoft To Do importeren | Tasks.Read | Leest titel, status en deadline van taken. |
| Teams-opdrachten importeren | EduAssignments.ReadBasic | Leest naam, status en deadline van opdrachten. |
| Synchroniseren tussen je eigen apparaten | Files.ReadWrite.AppFolder | Bewaart één **end-to-end versleuteld** bestand in Planora's eigen map in je OneDrive (Apps/Planora). Alleen jouw wachtwoordzin kan het openen — niet ik, niet Microsoft. Planora kan je andere bestanden niet zien. |

Deze gegevens gaan rechtstreeks tussen je apparaat en Microsoft. Voor je Microsoft-account geldt de privacyverklaring van Microsoft: https://privacy.microsoft.com. Een schoolaccount wordt beheerd door je school.

### Google Agenda (vrij/bezet)
Planora vraagt de kleinst mogelijke Google-toestemming: **alleen vrij/bezet** (`calendar.freebusy`). Planora ziet alleen *wanneer* je bezet bent in je hoofdagenda (van 7 dagen geleden tot 90 dagen vooruit) — nooit titels of details van afspraken. Het toegangstoken blijft ongeveer een uur op je apparaat en wordt nooit gesynchroniseerd.

Planora's gebruik en overdracht van informatie die van Google API's wordt ontvangen, voldoet aan het [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), inclusief de vereisten voor beperkt gebruik (Limited Use).

### Apple Agenda (.ics-bestanden)
Importeren en exporteren van `.ics`-bestanden gebeurt volledig op je apparaat.

## Updates, website en downloads
- De website en downloads staan bij **GitHub** (GitHub Pages en GitHub Releases). GitHub ontvangt je IP-adres en browsergegevens als je de site bezoekt of iets downloadt. Zie de privacyverklaring van GitHub: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement
- De **desktop-app** en de **Android-app** vragen GitHub "wat is de nieuwste versie?" (api.github.com). GitHub ziet je IP-adres en app-versie. In de Android-app kun je dit uitzetten bij Instellingen.

## Foutmeldingen
- **Via GitHub:** Planora maakt een melding met wat jij typt plus technische gegevens die je kunt bekijken en uitzetten (versie, soort apparaat, foutcodes — nooit je taken of agenda). Je verstuurt hem zelf met je GitHub-account. **Meldingen op GitHub zijn openbaar** — zet er geen persoonsgegevens in.
- **Per e-mail:** ik ontvang je e-mailadres en wat je schrijft. Ik bewaar deze e-mails tot maximaal 12 maanden nadat het probleem is opgelost en verwijder ze daarna.

## Doorgifte buiten de EU
GitHub, Microsoft en Google zijn Amerikaanse bedrijven (Microsoft en Google hebben ook datacenters in de EU). Voor doorgifte buiten de EU gebruiken zij het EU-VS Data Privacy Framework en/of de standaardcontractbepalingen van de Europese Commissie. Voor je eigen Microsoft- of Google-account geldt jouw overeenkomst met hen.

## Hoe lang gegevens bewaard worden
- Gegevens op je apparaat: tot je ze verwijdert (Instellingen → Privacy → Alles verwijderen), de app verwijdert of de sitegegevens van je browser wist.
- **Let op:** "Alles verwijderen" wist de Planora-gegevens **op dat apparaat** en logt je uit. Gebruikte je synchronisatie, dan blijven het versleutelde bestand in je OneDrive (Apps/Planora) en de gegevens op je andere apparaten bestaan — verwijder de map in OneDrive en gebruik "Alles verwijderen" op elk apparaat.
- Foutmeldingen per e-mail: tot maximaal 12 maanden nadat het probleem is opgelost.
- Logs van GitHub: volgens de privacyverklaring van GitHub.

## Opslag op je apparaat (cookies)
Planora slaat alleen informatie op je apparaat op die nodig is om de app te laten werken: je gegevens (IndexedDB), je instellingen en, als je Microsoft koppelt, inloggegevens (localStorage / sessionStorage; de inlogsoftware van Microsoft kan tijdens het inloggen kort een cookie gebruiken). De website bewaart zijn eigen bestanden zodat hij offline werkt. Er zijn **geen tracking-, advertentie- of analytische cookies**, dus er is geen cookiemelding.

## Je rechten
Je hebt het recht op inzage, correctie, verwijdering, beperking, bezwaar en een kopie van je gegevens, en je kunt toestemming intrekken. Omdat je Planora-gegevens op je eigen apparaat staan, kun je het meeste zelf doen: een back-up maken, aanpassen of alles verwijderen via Instellingen → Privacy. Voor foutmeldingen per e-mail of iets anders: mail **planoradevelopment@outlook.com** — ik reageer binnen een maand.

Je kunt ook een klacht indienen bij de **Autoriteit Persoonsgegevens** (https://autoriteitpersoonsgegevens.nl) of bij de toezichthouder in je eigen EU-land.

## Kinderen en gebruik op school
Planora is gemaakt voor leerlingen en studenten, ook op school. Je kunt Planora gebruiken zonder een account te koppelen. Ben je **jonger dan 16**, vraag dan een ouder of verzorger voordat je een persoonlijk Microsoft- of Google-account koppelt. Schoolaccounts worden beheerd door je school; die bepaalt welke apps ermee mogen koppelen.

## Beveiliging
Je gegevens blijven op je apparaat; je kunt ze versleutelen met een wachtwoordzin en de app vergrendelen. Back-ups en het synchronisatiebestand zijn altijd versleuteld. De app praat alleen met de diensten hierboven (afgedwongen met een Content Security Policy) en vraagt de kleinst mogelijke toestemmingen. Ben je je wachtwoordzin kwijt, dan kan niemand — ik ook niet — versleutelde gegevens terughalen.

## Wijzigingen
Als Planora anders met gegevens omgaat, pas ik deze pagina en de datum bovenaan aan.
