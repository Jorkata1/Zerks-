// The catalogue of the chapter-1 buildings: each model alone on a plot, lit like map.html and seen by its camera
// (36 degrees above the ground, along the diagonal, so the door is on the left face).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const TILES = [
  ['kk/ark', 'Ковчегът'], ['kk/drill', 'Карбонова сонда'], ['kk/geolocator', 'Геолокатор'], ['kk/pump', 'Помпа за вода'],
  ['kk/processor', 'Атмосферен процесор'], ['kk/veglab', 'Лаборатория за зеленчуци'], ['kk/home-10', 'Дом на колонистите'], ['kk/kitchen', 'Обща кухня'],
  ['kk/research-10', 'Рисърч станция'], ['kk/mine-portal', 'Мина: в началото тунел'], ['kk/mine', 'Мина: по-късно шахта'], ['kk/warehouse', 'Склад'],
  ['kk/furnace', 'Силициева пещ'], ['kk/solar', 'Слънчеви панели'], ['kk/batteries', 'Батерии'], ['kk/greenhouse', 'Оранжерия'],
];
// #phone: the same tiles three to a row at phone width (mockup/screens/buildings-kk.jpg), only the buildings we made
const PHONE_TILES = [
  ['kk/ark', 'Ковчегът'], ['kk/home-10', 'Дом на колонистите'], ['kk/kitchen', 'Обща кухня'], ['kk/processor', 'Атмосферен процесор'],
  ['kk/veglab', 'Лаборатория за зеленчуци'], ['kk/greenhouse', 'Оранжерия'], ['kk/research-10', 'Рисърч станция'],
  ['kk/warehouse', 'Склад'], ['kk/furnace', 'Силициева пещ'], ['kk/mine', 'Мина'],
  ['kk/pump', 'Помпа за вода'], ['kk/solar', 'Слънчеви панели'], ['kk/batteries', 'Батерии'], ['kk/geolocator', 'Геолокатор'],
];
// sideEl: the side views of a model dug into the ground are taken from 22 degrees, so the ground hides the block under it
function views(m, title, k, right, left, extra = [], sideEl = 4) {
  return { title, k, tiles: [
    [m, 'Откъм камерата на картата', 0, 0], [m, 'Отзад', 0, Math.PI],
    [m, 'Отгоре', 0, Math.PI / 4, 88], [m, 'Отпред', 0, Math.PI / 4, sideEl],
    [m, `Отдясно (${right})`, 0, -Math.PI / 4, sideEl], [m, `Отляво (${left})`, 0, 3 * Math.PI / 4, sideEl], ...extra,
  ] };
}
// #set=<name>: ideas side by side, level 1 on the left and level 10 on the right (art/3d/buildings/ideas)
const SETS = {
  // k: one scale for the whole sheet (metres per Blender unit), so the level-10 building stands bigger than level 1
  research: { title: 'Рисърч станцията: три идеи, на ниво 1 и на ниво 10', k: 3.7, tiles: [
    ['kk/ideas/research-a-1', 'А, лаборатория с проби: ниво 1'], ['kk/ideas/research-a-10', 'А: ниво 10, втори слот и учен'],
    ['kk/research-1', 'Б, обсерватория и компютри: ниво 1 (избрана)'], ['kk/research-10', 'Б: ниво 10, втори слот и учен'],
    ['kk/ideas/research-c-1', 'В, работилница за прототипи: ниво 1'], ['kk/ideas/research-c-10', 'В: ниво 10, втори слот и учен'],
  ] },
  // the Ark (Joro, 06.11.2026): two new ideas, each from the map's corner and from the back corner, then the one we have;
  // [name, label, metres per unit, turn]: the ideas at the scale they stand on the map, the CellCog Ark at its map scale
  ark: { title: 'Ковчегът: две идеи, отпред и отзад, и сегашният', tiles: [
    ['kk/ideas/ark-a', 'А, изправеният кораб, по-голям: откъм камерата', 4.15, 0], ['kk/ideas/ark-a', 'А: отзад', 4.15, Math.PI],
    ['kk/ideas/ark-b', 'Б, корабът на корема: откъм камерата', 4.15, 0], ['kk/ideas/ark-b', 'Б: отзад', 4.15, Math.PI],
    ['ark-v1', 'Сегашният (CellCog): откъм камерата', 0.72, 0], ['ark-v1', 'Сегашният: отзад', 0.72, Math.PI],
  ] },
  // one new model checked from the map's corner, the back, the top and three sides (11.11.2026):
  // [name, label, metres per unit, turn, elevation in degrees]
  rover: views('kk/rover', 'Роботът събирач: откъм картата, отзад, отгоре и от три страни', 17, 'ръката', 'мачтата'),
  dock: views('kk/dock-4', 'Докът с рамата: готовата рама откъм картата, отзад, отгоре и от три страни; етапите; на парцела на Ковчега', 4.6, 'страната към Ковчега', 'външната страна', [
    ['kk/dock-0', 'Ниво 12: празният док', 0, 0], ['kk/dock-1', 'Етап 1 (ниво 12, 200 стомана): кил, кърма, три ребра', 0, 0],
    ['kk/dock-2', 'Етап 2 (ниво 14, 500): седем ребра', 0, 0], ['kk/dock-3', 'Етап 3 (ниво 17, 1 000): всички ребра, носът, долните надлъжни греди', 0, 0],
    ['kk/ark+kk/dock-1@2.32,-1.82', 'На парцела на Ковчега (етап 1), в мащаба на картата', 4.15, 0, 36, 28],
    ['kk/ark+kk/dock-4@2.32,-1.82', 'На парцела на Ковчега отгоре: кранът и мястото за частите', 4.15, 0, 88, 28]]),
  claypit: views('kk/claypit', 'Глиненият изкоп: откъм картата, отзад, отгоре и от три страни (отстрани под 22°)', 5.4, 'рампата', 'навесът', [], 22),
  brickkiln: views('kk/brickkiln', 'Пещта за тухли: откъм картата, отзад, отгоре и от три страни', 5.3, 'изходът и тухлите', 'пресата и кабината'),
  copperworks: views('kk/copperworks', 'Цехът за мед: откъм картата, отзад, отгоре и от три страни', 5.3, 'телът и кабелите', 'резервоарите и рудата'),
  brickhome: { title: 'Тухленият дом: ниво 1, 10 и 20, откъм картата и отзад; първият дом за сравнение', k: 3.9, tiles: [
    ['kk/brickhome-1', 'Ниво 1: 2 стаи, 4 легла (строи се на ниво 20 на Ковчега)', 0, 0], ['kk/brickhome-1', 'Ниво 1: отзад', 0, Math.PI],
    ['kk/brickhome-10', 'Ниво 10: 5 стаи, 10 легла', 0, 0], ['kk/brickhome-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/brickhome-20', 'Ниво 20: 2 етажа, 10 стаи, 20 легла, зимна градина', 0, 0], ['kk/brickhome-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/brickhome-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/brickhome-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/brickhome-20', 'Ниво 20: отдясно (зимната градина)', 0, -Math.PI / 4, 4], ['kk/brickhome-20', 'Ниво 20: отляво', 0, 3 * Math.PI / 4, 4],
    ['kk/home-20', 'Първият дом на ниво 20, в същия мащаб', 0, 0], ['kk/brickhome-20', 'Тухленият дом на ниво 20, в същия мащаб', 0, 0],
  ] },
  canteen: { title: 'Столовата: ниво 1, 10 и 20, откъм картата и отзад; проверката на ниво 20; кухнята за сравнение', k: 4.2, tiles: [
    ['kk/canteen-1', 'Ниво 1: 8 места, две маси по четири (строи се на ниво 20 на Ковчега)', 0, 0], ['kk/canteen-1', 'Ниво 1: отзад, кухнята на готвача', 0, Math.PI],
    ['kk/canteen-10', 'Ниво 10: 10 места, и малка маса за двама', 0, 0], ['kk/canteen-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/canteen-20', 'Ниво 20: 20 места, пет маси по четири, подправки на покрива', 0, 0], ['kk/canteen-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/canteen-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/canteen-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/canteen-20', 'Ниво 20: отдясно (кухнята)', 0, -Math.PI / 4, 4], ['kk/canteen-20', 'Ниво 20: отляво', 0, 3 * Math.PI / 4, 4],
    ['kk/kitchen', 'Общата кухня, в същия мащаб', 0, 0], ['kk/canteen-20', 'Столовата на ниво 20, в същия мащаб', 0, 0],
  ] },
  antenna: { title: 'Чинията на антената на Ковчега: сгъната до ниво 18, разгъната след поправката', k: 4.15, tiles: [
    ['kk/ark', 'Ковчегът до ниво 18: чинията е сгъната (повредена при кацането)', 0, 0], ['kk/ark-18', 'Ковчегът от ниво 18: чинията е разгъната', 0, 0],
    ['kk/arkdish-folded', 'Отблизо: сгъната, като затворен чадър, без светлина', 9, 0], ['kk/arkdish-open', 'Отблизо: разгъната, гледа към контейнерите в орбита', 9, 0],
    ['kk/arkdish-folded', 'Сгъната: отстрани', 9, Math.PI / 2, 4], ['kk/arkdish-open', 'Разгъната: отстрани', 9, Math.PI / 2, 4],
    ['kk/arkdish-folded', 'Сгъната: отгоре', 9, 0, 88], ['kk/arkdish-open', 'Разгъната: отгоре', 9, 0, 88],
  ] },
  kitchen: { title: 'Общата кухня: ниво 1, 10 и 20, откъм картата и отзад; проверката на ниво 20; до столовата', k: 3.6, tiles: [
    ['kk/kitchen-1', 'Ниво 1: 8 места, печката и две маси по четири (строи се на ниво 3)', 0, 0], ['kk/kitchen-1', 'Ниво 1: отзад', 0, Math.PI],
    ['kk/kitchen-10', 'Ниво 10: 10 места, пристройка с маса за двама', 0, 0], ['kk/kitchen-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/kitchen-20', 'Ниво 20: 20 места, две пристройки, подправки на покрива', 0, 0], ['kk/kitchen-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/kitchen-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/kitchen-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/kitchen-20', 'Ниво 20: отдясно', 0, -Math.PI / 4, 4], ['kk/kitchen-20', 'Ниво 20: отляво', 0, 3 * Math.PI / 4, 4],
    ['kk/kitchen-20', 'Кухнята на ниво 20, в същия мащаб', 0, 0], ['kk/canteen-20', 'Столовата на ниво 20, в същия мащаб', 0, 0],
  ] },
  solar: { title: 'Слънчевите панели: един парцел, който расте с подобренията; ниво 1, 10 и 20', k: 4.4, tiles: [
    ['kk/solar-1', 'Ниво 1: един ред (строят се на ниво 5)', 0, 0], ['kk/solar-1', 'Ниво 1: отзад', 0, Math.PI],
    ['kk/solar-10', 'Ниво 10: три реда', 0, 0], ['kk/solar-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/solar-20', 'Ниво 20: пет реда, целият парцел', 0, 0], ['kk/solar-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/solar-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/solar-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/solar-20', 'Ниво 20: отдясно', 0, -Math.PI / 4, 4], ['kk/solar-20', 'Ниво 20: отляво', 0, 3 * Math.PI / 4, 4],
  ] },
  drill: { title: 'Карбоновата сонда в нашия стил: ниво 1, 10 и 20; старата от CellCog за сравнение', k: 4.4, tiles: [
    ['kk/drill-1', 'Ниво 1: обучението', 0, 0], ['kk/drill-1', 'Ниво 1: отзад', 0, Math.PI],
    ['kk/drill-10', 'Ниво 10: по-висока кула, повече щанги, по-голям силоз', 0, 0], ['kk/drill-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/drill-20', 'Ниво 20: най-високата кула, два мотора, два силоза', 0, 0], ['kk/drill-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/drill-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/drill-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/drill-20', 'Ниво 20: отдясно (силозите)', 0, -Math.PI / 4, 4], ['kk/drill-20', 'Ниво 20: отляво (щангите)', 0, 3 * Math.PI / 4, 4],
    ['carbon-drill-v1', 'Старата сонда от CellCog (всяка вписана в плочката)', -1, 0], ['kk/drill-10', 'Новата на ниво 10 (вписана в плочката)', -1, 0],
  ] },
  greenhouse: { title: 'Оранжерията: ниво 1, 10 и 20; от ниво 16 и храна, от 17 леха за разсад', k: 4.0, tiles: [
    ['kk/greenhouse-1', 'Ниво 1: къса арка, само за въздух (строи се на ниво 8)', 0, 0], ['kk/greenhouse-1', 'Ниво 1: отзад', 0, Math.PI],
    ['kk/greenhouse-10', 'Ниво 10: арката е колкото парцела', 0, 0], ['kk/greenhouse-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/greenhouse-20', 'Ниво 20: втора арка с доматите и разсада, превключвателят', 0, 0], ['kk/greenhouse-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/greenhouse-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/greenhouse-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/greenhouse-20', 'Ниво 20: отдясно (модулът)', 0, -Math.PI / 4, 4], ['kk/greenhouse-20', 'Ниво 20: отляво', 0, 3 * Math.PI / 4, 4],
  ] },
  warehouse: { title: 'Складът: ниво 1, 10 и 20 (1 000, около 20 000 и около 68 000 от всеки ресурс)', k: 3.8, tiles: [
    ['kk/warehouse-1', 'Ниво 1: къс хангар, един контейнер (строи се на ниво 4)', 0, 0], ['kk/warehouse-1', 'Ниво 1: отзад', 0, Math.PI],
    ['kk/warehouse-10', 'Ниво 10: по-дълъг хангар, купчина контейнери', 0, 0], ['kk/warehouse-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/warehouse-20', 'Ниво 20: още по-дълъг, втора врата, по-висок кран, още купчини', 0, 0], ['kk/warehouse-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/warehouse-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/warehouse-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/warehouse-20', 'Ниво 20: отдясно (кранът)', 0, -Math.PI / 4, 4], ['kk/warehouse-20', 'Ниво 20: отляво (втората врата)', 0, 3 * Math.PI / 4, 4],
  ] },
  batteries: { title: 'Батериите: ниво 1, 10 и 20; повече клетки за по-дълга нощ', k: 4.6, tiles: [
    ['kk/batteries-1', 'Ниво 1: две клетки (строят се на ниво 7)', 0, 0], ['kk/batteries-1', 'Ниво 1: отзад', 0, Math.PI],
    ['kk/batteries-10', 'Ниво 10: четири клетки', 0, 0], ['kk/batteries-10', 'Ниво 10: отзад', 0, Math.PI],
    ['kk/batteries-20', 'Ниво 20: осем клетки, медни шини, охладител', 0, 0], ['kk/batteries-20', 'Ниво 20: отзад', 0, Math.PI],
    ['kk/batteries-20', 'Ниво 20: отгоре', 0, Math.PI / 4, 88], ['kk/batteries-20', 'Ниво 20: отпред', 0, Math.PI / 4, 4],
    ['kk/batteries-20', 'Ниво 20: отдясно', 0, -Math.PI / 4, 4], ['kk/batteries-20', 'Ниво 20: отляво', 0, 3 * Math.PI / 4, 4],
  ] },
  // every model on one phone-width sheet, three to a row, the variants of a building on one row at one scale
  // (11.11.2026, for Salamen): [null, heading] starts a group
  all: { title: 'Zerks-X6: всички модели (11.11.2026)', cols: 3, big: true, tiles: [
    [null, 'Ковчегът, обучението и роботите'],
    ['kk/ark', 'Ковчегът (до ниво 18)', -1, 0], ['kk/ark-18', 'Ковчегът от ниво 18: чинията', -1, 0], ['kk/geolocator', 'Геолокатор', -1, 0],
    ['kk/drill-1', 'Карбонова сонда: ниво 1', 3.6, 0], ['kk/drill-10', 'Сондата: ниво 10', 3.6, 0], ['kk/drill-20', 'Сондата: ниво 20', 3.6, 0],
    ['kk/pump', 'Помпа за вода', -1, 0], ['kk/processor', 'Атмосферен процесор', -1, 0], ['kk/veglab', 'Лаборатория за зеленчуци', -1, 0],
    ['kk/rover', 'Роботът събирач', 14, 0], ['kk/drone', 'Строителният дрон', 22, 0], ['kk/research-1', 'Рисърч станция: ниво 1', 3.6, 0],
    [null, 'Глава 1: колонията'],
    ['kk/home-1', 'Дом: ниво 1', 3.4, 0], ['kk/home-10', 'Дом: ниво 10', 3.4, 0], ['kk/home-20', 'Дом: ниво 20', 3.4, 0],
    ['kk/kitchen-1', 'Кухня: ниво 1', 3.4, 0], ['kk/kitchen-10', 'Кухня: ниво 10', 3.4, 0], ['kk/kitchen-20', 'Кухня: ниво 20', 3.4, 0],
    ['kk/warehouse-1', 'Склад: ниво 1', 3.6, 0], ['kk/warehouse-10', 'Склад: ниво 10', 3.6, 0], ['kk/warehouse-20', 'Склад: ниво 20', 3.6, 0],
    ['kk/solar-1', 'Панели: ниво 1', 4.2, 0], ['kk/solar-10', 'Панели: ниво 10', 4.2, 0], ['kk/solar-20', 'Панели: ниво 20', 4.2, 0],
    ['kk/batteries-1', 'Батерии: ниво 1', 4.4, 0], ['kk/batteries-10', 'Батерии: ниво 10', 4.4, 0], ['kk/batteries-20', 'Батерии: ниво 20', 4.4, 0],
    ['kk/greenhouse-1', 'Оранжерия: ниво 1', 3.8, 0], ['kk/greenhouse-10', 'Оранжерия: ниво 10', 3.8, 0], ['kk/greenhouse-20', 'Оранжерия: ниво 20', 3.8, 0],
    ['kk/research-10', 'Рисърч станция: ниво 10', 3.6, 0], ['kk/mine-portal', 'Мина: тунел', -1, 0], ['kk/mine', 'Мина: шахта', -1, 0],
    ['kk/furnace', 'Силициева пещ', -1, 0],
    [null, 'Глава 2'],
    ['kk/smelter', 'Топилня (ниво 11)', -1, 0], ['kk/claypit', 'Глинен изкоп (ниво 13)', -1, 0], ['kk/brickkiln', 'Пещ за тухли (ниво 15)', -1, 0],
    ['kk/copperworks', 'Цех за мед (ниво 19)', -1, 0], ['kk/dock-1', 'Докът: етап 1 (ниво 12)', 4.0, 0], ['kk/dock-2', 'Докът: етап 2 (ниво 14)', 4.0, 0],
    ['kk/dock-3', 'Докът: етап 3 (ниво 17)', 4.0, 0], ['kk/dock-4', 'Докът: рамата е готова (ниво 19)', 4.0, 0], ['kk/ark-18+kk/dock-4@2.32,-1.82', 'Докът на парцела на Ковчега', 4.15, 0, 36, 28],
    ['kk/brickhome-1', 'Тухлен дом: ниво 1', 3.4, 0], ['kk/brickhome-10', 'Тухлен дом: ниво 10', 3.4, 0], ['kk/brickhome-20', 'Тухлен дом: ниво 20', 3.4, 0],
    ['kk/canteen-1', 'Столова: ниво 1', 3.4, 0], ['kk/canteen-10', 'Столова: ниво 10', 3.4, 0], ['kk/canteen-20', 'Столова: ниво 20', 3.4, 0],
  ] },
  smelter: views('kk/smelter', 'Топилнята: откъм картата, отзад, отгоре и от три страни', 5.2, 'мачтата и трансформаторът', 'бункерът и лентата',
    [['kk/smelter', 'Топилнята в мащаба на картата', 4.15, 0], ['kk/furnace', 'Силициевата пещ, до която стои, в същия мащаб', 4.15, 0]]),
};
// the same models as #set=all, in pages of six, two to a row, so a phone shows them sharp (#set=all1 … all9)
const PAGES = [
  ['Ковчегът и роботите', [['kk/ark', 'Ковчегът (до ниво 18)', -1, 0], ['kk/ark-18', 'Ковчегът от ниво 18: чинията', -1, 0], ['kk/geolocator', 'Геолокатор', -1, 0], ['kk/pump', 'Помпа за вода', -1, 0], ['kk/rover', 'Роботът събирач', 14, 0], ['kk/drone', 'Строителният дрон', 22, 0]]],
  ['Обучението', [['kk/drill-1', 'Карбонова сонда: ниво 1', 4.8, 0], ['kk/drill-10', 'Сондата: ниво 10', 4.8, 0], ['kk/drill-20', 'Сондата: ниво 20', 4.8, 0], ['kk/processor', 'Атмосферен процесор', -1, 0], ['kk/veglab', 'Лаборатория за зеленчуци', -1, 0], ['kk/research-1', 'Рисърч станция: ниво 1', -1, 0]]],
  ['Глава 1: домът и кухнята', [['kk/home-1', 'Дом: ниво 1', 5.0, 0], ['kk/home-10', 'Дом: ниво 10', 5.0, 0], ['kk/home-20', 'Дом: ниво 20', 5.0, 0], ['kk/kitchen-1', 'Кухня: ниво 1', 4.4, 0], ['kk/kitchen-10', 'Кухня: ниво 10', 4.4, 0], ['kk/kitchen-20', 'Кухня: ниво 20', 4.4, 0]]],
  ['Глава 1: складът и панелите', [['kk/warehouse-1', 'Склад: ниво 1', 4.8, 0], ['kk/warehouse-10', 'Склад: ниво 10', 4.8, 0], ['kk/warehouse-20', 'Склад: ниво 20', 4.8, 0], ['kk/solar-1', 'Панели: ниво 1', 4.8, 0], ['kk/solar-10', 'Панели: ниво 10', 4.8, 0], ['kk/solar-20', 'Панели: ниво 20', 4.8, 0]]],
  ['Глава 1: батериите и оранжерията', [['kk/batteries-1', 'Батерии: ниво 1', 6.0, 0], ['kk/batteries-10', 'Батерии: ниво 10', 6.0, 0], ['kk/batteries-20', 'Батерии: ниво 20', 6.0, 0], ['kk/greenhouse-1', 'Оранжерия: ниво 1', 4.5, 0], ['kk/greenhouse-10', 'Оранжерия: ниво 10', 4.5, 0], ['kk/greenhouse-20', 'Оранжерия: ниво 20', 4.5, 0]]],
  ['Глава 1 и 2: рисърчът, мината, пещите', [['kk/research-10', 'Рисърч станция: ниво 10', -1, 0], ['kk/mine-portal', 'Мина: тунел', -1, 0], ['kk/mine', 'Мина: шахта', -1, 0], ['kk/furnace', 'Силициева пещ', -1, 0], ['kk/smelter', 'Топилня (ниво 11)', -1, 0], ['kk/claypit', 'Глинен изкоп (ниво 13)', -1, 0]]],
  ['Глава 2: тухлите, медта, докът', [['kk/brickkiln', 'Пещ за тухли (ниво 15)', -1, 0], ['kk/copperworks', 'Цех за мед (ниво 19)', -1, 0], ['kk/dock-1', 'Докът: етап 1 (ниво 12)', 4.0, 0], ['kk/dock-2', 'Докът: етап 2 (ниво 14)', 4.0, 0], ['kk/dock-3', 'Докът: етап 3 (ниво 17)', 4.0, 0], ['kk/dock-4', 'Докът: рамата е готова (ниво 19)', 4.0, 0]]],
  ['Глава 2: тухленият дом и столовата', [['kk/brickhome-1', 'Тухлен дом: ниво 1', 4.5, 0], ['kk/brickhome-10', 'Тухлен дом: ниво 10', 4.5, 0], ['kk/brickhome-20', 'Тухлен дом: ниво 20', 4.5, 0], ['kk/canteen-1', 'Столова: ниво 1', 5.2, 0], ['kk/canteen-10', 'Столова: ниво 10', 5.2, 0], ['kk/canteen-20', 'Столова: ниво 20', 5.2, 0]]],
  ['Глава 2: докът на парцела на Ковчега', [['kk/ark-18+kk/dock-4@2.32,-1.82', 'Ковчегът и докът с готовата рама, в мащаба на картата', 4.15, 0, 36, 28], ['kk/ark-18+kk/dock-4@2.32,-1.82', 'Същото отгоре: кранът и мястото за частите', 4.15, 0, 88, 28]]],
];
PAGES.forEach(([t, tiles], i) => { SETS['all' + (i + 1)] = { title: `Zerks-X6: модели · ${t} · ${i + 1}/${PAGES.length}`, cols: 2, big: true, tiles }; });
const SET = SETS[(location.hash.match(/set=(\w+)/) || [])[1]];
const PHONE = location.hash.includes('phone') || !!SET;
if (SET && !SET.cols) document.body.classList.add('pair');
if (SET && SET.cols === 2) document.body.classList.add('two');
if (SET && SET.big) document.body.classList.add('big');
if (PHONE) { document.body.classList.add('phone'); document.querySelector('h1').textContent = SET ? SET.title : 'Сградите на глава 1 в избрания стил'; }
const ONE = (location.hash.match(/tile=([\w/-]+)/) || [])[1];
const PX = 788; // one tile, drawn at twice the size it is shown

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, stencil: true });
renderer.setPixelRatio(1); renderer.setSize(PX, PX);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const gltf = new GLTFLoader(), draco = new DRACOLoader();
draco.setDecoderPath('node_modules/three/examples/jsm/libs/draco/'); gltf.setDRACOLoader(draco);

const dirAt = deg => { const e = THREE.MathUtils.degToRad(deg); return new THREE.Vector3(Math.cos(e) * Math.SQRT1_2, Math.sin(e), Math.cos(e) * Math.SQRT1_2); };
const FOOT = 9.6, PLOT = 14, VIEW = 16; // metres: the building's footprint, the plot, the width of the picture

async function tile(name, fixedK, turn = 0, el = 36, fit = false) {
  const DIR = dirAt(el);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9d39a);
  scene.environment = env; scene.environmentIntensity = 0.35;
  // a whiter bounce than on the map's orange ground, so the cream stays cream
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc2ad, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(-30, 80, 50); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 5;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 200 }); sun.shadow.camera.updateProjectionMatrix();
  const plot = new THREE.Mesh(new THREE.BoxGeometry(PLOT, 0.02, PLOT), new THREE.MeshStandardMaterial({ color: 0xe0d7c6, roughness: 0.9 }));
  plot.position.y = -0.01; plot.receiveShadow = true; scene.add(plot);

  // 'a+b@x,y': more models in one picture, b set at (x, y) Blender units from a (the dock on the Ark's plot)
  const root = new THREE.Group();
  for (const part of name.split('+')) {
    const [path, at] = part.split('@'), m = (await gltf.loadAsync('models/' + path + '.glb')).scene;
    if (at) { const [x, y] = at.split(',').map(Number); m.position.set(x, 0, -y); }
    root.add(m);
  }
  // a model dug into the ground (the clay pit) marks its opening with the material 'hole': it is not drawn, it only
  // keeps the plot from covering the pit (stencil)
  let dug = false;
  root.traverse(o => {
    if (!o.isMesh) return;
    if (o.material && o.material.name === 'hole') {
      o.material = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
      o.renderOrder = -1; o.castShadow = false; o.receiveShadow = false; dug = true; return;
    }
    const ms = Array.isArray(o.material) ? o.material : [o.material], clear = ms.some(m => m.transparent);
    o.castShadow = !clear; o.receiveShadow = true;
    for (const m of ms) { m.metalness = 0; if (m.transparent) { m.depthWrite = false; m.side = THREE.DoubleSide; } else m.roughness = Math.max(0.5, m.roughness ?? 0.6); }
    if (clear) o.renderOrder = 2;
  });
  // the ground runs to the edge of the picture, as on the map, so the dug block stays under it
  if (dug) { Object.assign(plot.material, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.KeepStencilOp }); plot.scale.set(4, 1, 4); }
  root.rotation.y = turn; root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(root), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const k = fixedK || FOOT / Math.max(s.x, s.z);
  if (dug) { b.min.y = 0; s.y = b.max.y; }                 // dug in: keep its ground at the plot, not its floor
  root.scale.setScalar(k); root.position.set(-c.x * k, -b.min.y * k, -c.z * k); scene.add(root);

  // fit = the side of the first model's plot in metres (28 for the Ark's 2x2), drawn round its origin
  if (fit) { plot.scale.set(fit / PLOT, 1, fit / PLOT); plot.position.set(-c.x * k, -0.01, -c.z * k); sun.shadow.camera.left = sun.shadow.camera.bottom = -40; sun.shadow.camera.right = sun.shadow.camera.top = 40; sun.shadow.camera.updateProjectionMatrix(); }
  const h = s.y * k, cam = new THREE.OrthographicCamera(-VIEW / 2, VIEW / 2, VIEW / 2, -VIEW / 2, 1, 600);
  const look = new THREE.Vector3(0, h * 0.36, 0);
  cam.position.copy(look).addScaledVector(DIR, 300); cam.lookAt(look); cam.updateMatrixWorld();
  // a tall model (the carbon drill) gets a wider picture, so its top is not cut off
  const box = new THREE.Box3().setFromObject(root), top = new THREE.Vector3(0, box.max.y, 0).applyMatrix4(cam.matrixWorldInverse).y;
  if (fit) {
    // the whole group in the picture: fit the frustum round its projected box
    box.union(new THREE.Box3().setFromObject(plot));
    const pts = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse));
    const lo = { x: Math.min(...pts.map(q => q.x)), y: Math.min(...pts.map(q => q.y)) }, hi = { x: Math.max(...pts.map(q => q.x)), y: Math.max(...pts.map(q => q.y)) };
    const v = Math.max(hi.x - lo.x, hi.y - lo.y) / 2 * 1.08, cx = (lo.x + hi.x) / 2, cy = (lo.y + hi.y) / 2;
    Object.assign(cam, { left: cx - v, right: cx + v, top: cy + v, bottom: cy - v }); cam.updateProjectionMatrix();
  } else if (top > VIEW / 2 * 0.9) {
    const v = (top + VIEW / 2) / 1.85; // keep the bottom edge, leave a margin above the top
    Object.assign(cam, { left: -v, right: v, top: v, bottom: -v }); cam.position.addScaledVector(cam.up.clone().applyQuaternion(cam.quaternion), v - VIEW / 2); cam.updateProjectionMatrix();
  }
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

const grid = document.getElementById('grid');
for (const [name, label, k, turn, el, fit] of ONE ? TILES.filter(t => t[0] === ONE) : SET ? SET.tiles : PHONE ? PHONE_TILES : TILES) {
  if (name === null) { const h = document.createElement('div'); h.className = 'sect'; h.textContent = label; grid.append(h); continue; }
  const card = document.createElement('div'); card.className = 'card';
  const img = new Image(); img.src = await tile(name, k < 0 ? 0 : (k || (SET && SET.k)), turn || 0, el ?? 36, fit || 0);   // k < 0: fit the tile await img.decode();
  const cap = document.createElement('div'); cap.textContent = label;
  card.append(img, cap); grid.append(card);
}
await document.fonts.ready;
window.__ready = true;
