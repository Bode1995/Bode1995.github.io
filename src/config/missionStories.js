import { getBossDefinition } from './bosses.js';
import { getWorldDefinition } from './worlds.js';

export const MISSION_STORIES = {
  levels: {
    1: {
      1: 'Die Sensoren melden erste Angriffe am Außenposten – halte die Stellung, bevor die Verteidigung fällt.',
      2: 'Weitere Feinde brechen durch die äußere Linie und drängen direkt auf das Zentrum zu.',
      3: 'Unter der Erde bewegt sich etwas – seit den Beben greifen die Gegner aus allen Richtungen an.',
      4: 'Die Versorgung ist fast abgeschnitten, und nur dieser Bereich hält den Angriff noch auf.',
      5: 'Der Außenposten steht kurz vor dem Fall – überlebe diese Welle und der Rückzugspfad bleibt offen.',
    },
    2: {
      1: 'Vor dir liegt verbrannter Boden, aus dessen Spalten neue Gegner in die Arena drängen.',
      2: 'Die Hitze nimmt zu und zwingt dich, zwischen Druck von vorn und Gefahr aus dem Boden zu überleben.',
      3: 'Lavafelder schneiden Wege ab, während die Angreifer dichter und aggressiver werden.',
      4: 'Der Himmel glüht über dir, und die Arena wird zu eng für Fehler oder Zögern.',
      5: 'Hinter den letzten Feuerlinien liegt der nächste Abschnitt – aber nur, wenn du diesen Ansturm brichst.',
    },
    3: {
      1: 'Eis überzieht das Kampffeld und macht jede Bewegung schwerfälliger als zuvor.',
      2: 'Gefrorene Trümmer blockieren die Sicht, und die Gegner nutzen jede Lücke in deiner Bewegung.',
      3: 'Die Kälte hält alles fest, aber der Angriff rollt weiter und lässt dir kaum Raum zum Atmen.',
      4: 'Im Frost wirkt alles langsamer – bis die nächste Welle plötzlich direkt vor dir steht.',
      5: 'Wenn du diese letzte gefrorene Front hältst, bleibt der Weg in das verseuchte Gebiet offen.',
    },
    4: {
      1: 'Grüner Nebel liegt über dem Schlachtfeld und aus ihm tauchen die ersten verseuchten Gegner auf.',
      2: 'Jeder Bereich, den du freikämpfst, wird sofort vom nächsten giftigen Schub wieder bedroht.',
      3: 'Die Luft selbst arbeitet gegen dich, während immer mehr Gegner in die Arena nachdrücken.',
      4: 'Vor dir liegt nur noch Verfall – und eine letzte Verteidigungslinie aus Gift und Masse.',
      5: 'Hinter diesem Angriff wartet das Herz der ganzen Katastrophe – jetzt gibt es kein Zurück mehr.',
    },
  },
  bosses: {
    earthTitan: 'Tief unter den zerstörten Zonen erhebt sich der Titan des Kerns – wenn du ihn nicht stoppst, war alles davor nur der Anfang.',
  },
};

export function getMissionStory(mission) {
  if (!mission) return null;
  if (mission.type === 'boss') {
    const boss = getBossDefinition(mission.id || mission.bossId);
    return {
      title: boss.name,
      text: MISSION_STORIES.bosses[boss.id] || '',
    };
  }

  const world = mission.world;
  const level = mission.level;
  const worldDef = getWorldDefinition(world);
  return {
    title: `${worldDef.themeName} · Level ${level}`,
    text: MISSION_STORIES.levels?.[world]?.[level] || '',
  };
}
