import { getWorldDefinition } from './worlds.js';

export const WORLD_INTROS = {
  1: {
    title: 'Die Blütezeit',
    text: 'Die ersten Notrufe aus der Blütezeit klingen noch, als würden sie von einem friedlichen Außenposten stammen, doch hinter jeder unterbrochenen Übertragung steckt bereits ein koordinierter Angriff. Sensorbojen verschwinden entlang der Versorgungsrouten, Erntedrohnen treiben ausgebrannt über den Feldern, und die Verteidigung meldet Kontakte, die sich schneller anpassen als jede bekannte Frontwelle. Du bist nicht hier, um nur einen Sektor zu halten – du sollst herausfinden, wer diese Offensive lenkt, den Korridor zur Kolonie offen halten und verhindern, dass die Menschheit schon im fruchtbarsten Teil ihrer Welt den Boden verliert.'
  },
  2: {
    title: 'Der Aufbruch des Feuers',
    text: 'Die Spur aus der Blütezeit führt direkt in die verbrannten Zonen des Feuergürtels, wo aufgerissene Erdspalten wie absichtlich geöffnete Schleusen wirken. Was zuerst wie bloße Zerstörung aussah, entpuppt sich hier als planvolle Eskalation: Unter dem Lavastaub liegen Bohrkerne, verstärkte Brutkammern und Signale, die aus großer Tiefe synchronisiert werden. Jede Stellung, die du im Feuerreich hältst, beweist, dass die Angreifer Ressourcen sammeln und ihren Vormarsch vorbereiten. Wenn du jetzt nicht durchbrichst, wird aus vereinzelten Angriffen ein zusammenhängender Krieg, der die oberen Welten von innen heraus verbrennt.'
  },
  3: {
    title: 'Die große Erstarrung',
    text: 'Hinter der Hitze wartet keine Entlastung, sondern eine stillere und gefährlichere Front. In der großen Erstarrung liegen ganze Forschungsstationen unter Eis begraben, als hätte jemand ihre Evakuierung exakt einen Moment zu spät ausgelöst. Zwischen gefrorenen Wracks tauchen Datenfragmente auf, die dasselbe Muster zeigen wie im Feuerreich: Die Invasion folgt einem langfristigen Plan, und jeder verlorene Außenposten liefert dem Feind neue Energie für etwas Größeres. Du kämpfst nun nicht mehr nur gegen Wellen, sondern gegen die letzten Minuten eines Countdowns, dessen Ende unter dem Eis bereits vorbereitet wurde.'
  },
  4: {
    title: 'Das giftige Zeitalter',
    text: 'Im verseuchten Grenzgebiet wird endlich sichtbar, worauf alles hinausläuft. Der Nebel ist kein Nebenprodukt der Schlacht, sondern der Vorhang für eine finale Umformung der Welt: verseuchte Türme speisen das Netzwerk, die Luft selbst trägt feindliche Signale weiter, und hinter jeder Giftwolke verdichten sich die Hinweise auf einen Kern, der tief unter den Ruinen erwacht. Die Blütezeit fiel, das Feuer wurde geschürt und das Eis als Deckmantel genutzt, damit dieser letzte Abschnitt ungestört vorbereitet werden konnte. Wenn du hier standhältst, erreichst du den Ursprung des Konflikts – und zwingst den Gegner, sich vor dem finalen Zusammenstoß offen zu zeigen.'
  },
};

export function isWorldIntroMission(mission) {
  if (!mission || mission.type !== 'level') return false;
  return mission.level === 1 && Object.prototype.hasOwnProperty.call(WORLD_INTROS, mission.world);
}

export function getWorldIntro(mission) {
  if (!isWorldIntroMission(mission)) return null;

  const intro = WORLD_INTROS[mission.world];
  if (!intro?.text) return null;

  return {
    title: intro.title || getWorldDefinition(mission.world).themeName,
    text: intro.text,
  };
}
