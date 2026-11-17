import type { ChapterId } from './state';

export interface ChapterInfo {
  id: ChapterId;
  scene: string;
  planet: string;
  name: string;
  topic: string;
  teaser: string;
  x: number;
  y: number;
  scale: number;
}

// Planet positions on the galaxy map (world 2400 x 1500).
export const CHAPTER_INFO: ChapterInfo[] = [
  { id: 'forge', scene: 'forge', planet: 'p-forge', name: 'Schmiede Kepler-p', topic: 'p-Hacking & QRPs', teaser: 'Wie aus Nichts ein Ergebnis wird.', x: 520, y: 520, scale: 1 },
  { id: 'archive', scene: 'archive', planet: 'p-archive', name: 'Archivmond Schublade', topic: 'Publikationsbias', teaser: 'Wo die Nullbefunde schlafen.', x: 900, y: 1050, scale: 1 },
  { id: 'power', scene: 'power', planet: 'p-power', name: 'Power-Nebel', topic: 'Stichprobe & Power', teaser: 'Kleine Studien, große Irrtümer.', x: 1300, y: 600, scale: 1 },
  { id: 'vault', scene: 'vault', planet: 'p-vault', name: 'Zeitstempel-Tresor', topic: 'Präregistrierung', teaser: 'Erst planen, dann schauen.', x: 1700, y: 1100, scale: 1 },
  { id: 'lab', scene: 'lab', planet: 'p-lab', name: 'Offenes Labor', topic: 'Open Data & FAIR', teaser: 'Teilen, damit andere prüfen können.', x: 1960, y: 520, scale: 1 },
  { id: 'press', scene: 'press', planet: 'p-press', name: 'Satellit Druckerpresse', topic: 'Peer Review & Open Access', teaser: 'Wer prüft, wer liest mit?', x: 1500, y: 260, scale: 1 },
  { id: 'citizen', scene: 'citizen', planet: 'p-citizen', name: 'Planet Vielfalt', topic: 'Citizen Science', teaser: 'Forschung mit allen, für alle.', x: 980, y: 260, scale: 1 },
  { id: 'finale', scene: 'finale', planet: 'p-finale', name: 'Hype-Nebel', topic: 'Finale: Many Labs', teaser: 'Die große Replikation.', x: 2150, y: 1250, scale: 1.1 },
];

export const CRYSTALS: { id: string; x: number; y: number; fact: string }[] = [
  { id: 'c1', x: 300, y: 900, fact: 'Open Science macht jeden Schritt nachvollziehbar: Plan, Daten, Code, Bericht.' },
  { id: 'c2', x: 760, y: 760, fact: 'QRPs sind meist keine böse Absicht, sondern Folge von Publikationsdruck.' },
  { id: 'c3', x: 1150, y: 1300, fact: 'HARKing: Hypothesen erst nach den Ergebnissen formulieren.' },
  { id: 'c4', x: 1520, y: 880, fact: 'Exploratives ist erlaubt, muss aber als exploratorisch gekennzeichnet sein.' },
  { id: 'c5', x: 2250, y: 820, fact: 'Lizenzen wie CC-BY oder CC0 machen klar, wie Daten genutzt werden dürfen.' },
  { id: 'c6', x: 1800, y: 180, fact: 'Preprints machen Ergebnisse sofort sichtbar, schon vor dem Peer Review.' },
  { id: 'c7', x: 620, y: 180, fact: 'Konzeptionelle Replikation: gleiche Theorie, andere Methode oder Population.' },
  { id: 'c8', x: 2300, y: 1420, fact: 'Ein Open Lab Notebook dokumentiert auch, was nicht geklappt hat.' },
];
