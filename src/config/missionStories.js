export const worldIntro = Object.freeze({
  1: Object.freeze({
    title: 'Der Einschlag',
    text: 'Vor wenigen Tagen schlugen mehrere unbekannte Objekte auf der Erde ein. Kurz darauf fielen ganze Regionen aus – Kommunikation, Strom, Verteidigung. Als die ersten Einheiten auftauchten, war klar: Das ist kein Zufall. Etwas ist hier gelandet, hat sich sofort ausgebreitet und nutzt unsere eigene Infrastruktur gegen uns. Du wirst in das erste Einsatzgebiet geschickt – nicht um zu gewinnen, sondern um herauszufinden, womit wir es zu tun haben.',
  }),
  2: Object.freeze({
    title: 'Die Ausbreitung',
    text: 'Unter den Einschlagszonen entstehen Strukturen, die nicht von dieser Welt sind. Sie wachsen, verbinden sich und breiten sich unter der Oberfläche weiter aus. Die Angriffe folgen keinem Chaos – sie sichern Gebiete, bauen Verbindungen auf und treiben etwas systematisch voran. Du kämpfst dich durch ihre Anlagen und erkennst: Die Erde wird nicht nur angegriffen… sie wird umgebaut.',
  }),
  3: Object.freeze({
    title: 'Die Anpassung',
    text: 'In verlassenen Stationen stoßen die Einsatzteams auf Daten, die alles verändern. Die Einheiten reagieren auf jeden Widerstand, passen sich an und werden mit jeder Begegnung effizienter. Sie lernen. Was als Angriff begann, ist inzwischen ein Prozess geworden – einer, der sich selbst verbessert. Die Front verschiebt sich, und jeder Einsatz wird gefährlicher als der davor.',
  }),
  4: Object.freeze({
    title: 'Der Kern',
    text: 'Alle Hinweise führen in ein Gebiet, das vollständig von der fremden Struktur durchzogen ist. Energie, Signale und Einheiten laufen hier zusammen. Was aufgebaut wurde, erreicht seinen Zweck: Im Zentrum entsteht etwas, das die gesamte Ausbreitung steuern soll. Ein Kern. Wenn er aktiv wird, gibt es kein Zurück mehr. Dies ist der Punkt, an dem alles entschieden wird.',
  }),
});

export function isWorldIntroMission(mission) {
  if (!mission || mission.type !== 'level') return false;
  return mission.level === 1 && Object.prototype.hasOwnProperty.call(worldIntro, mission.world);
}

export function getWorldIntro(mission) {
  if (!isWorldIntroMission(mission)) return null;
  return worldIntro[mission.world] || null;
}
