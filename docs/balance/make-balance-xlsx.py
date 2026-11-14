# Builds docs/balance/Zerks-X6-balance.xlsx from docs/balance/balance.json (made by `npm run balance` in game/).
#   python3 docs/balance/make-balance-xlsx.py
import json
import os
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "balance.json"), encoding="utf-8"))
OUT = os.path.join(HERE, "Zerks-X6-balance.xlsx")

F = "Arial"
TITLE = Font(name=F, bold=True, size=14)
BOLD = Font(name=F, bold=True)
NORMAL = Font(name=F)
GREY = Font(name=F, italic=True, color="5A6478")
RED = Font(name=F, bold=True, color="B42318")
HEAD = PatternFill("solid", fgColor="E8ECF5")
BLOCK = PatternFill("solid", fgColor="FFF4E5")
thin = Side(style="thin", color="C9D0DE")
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
WRAP = Alignment(wrap_text=True, vertical="top")

RES_BG = {
    "carbon": "карбон", "water": "вода", "stone": "камък", "food": "храна", "quartz": "кварц", "silicon": "силиций",
    "iron": "желязо", "steel": "стомана", "clay": "глина", "bricks": "тухли", "copper": "мед", "cables": "кабели",
    "seedlings": "разсад",
}
PROD_BG = {
    "carbon/min": "карбон/мин", "water/min": "вода/мин", "food/min": "храна/мин", "air/min": "въздух/мин",
    "stone/min per worker": "камък/мин на работник", "quartz/min per worker": "кварц/мин на работник",
    "iron/min per worker": "желязо/мин на работник", "copper/min per worker": "мед/мин на работник",
    "silicon/min": "силиций/мин", "kW by day": "kW денем", "kWh": "kWh", "steel/min": "стомана/мин",
    "clay/min": "глина/мин", "bricks/min": "тухли/мин", "cables/min": "кабели/мин",
    "seedlings/min (from level 17)": "разсад/мин (от ниво 17)",
}
BOTTLENECK_BG = {"research and building": "рисърч и строеж", "atmosphere": "атмосфера", **RES_BG}


def hm(minutes):
    m = round(minutes)
    return f"{m // 60} ч {m % 60:02d} мин" if m >= 60 else f"{minutes:.0f} мин"


def test_time(minutes):
    """The test tempo in seconds below a minute, with a decimal comma."""
    return f"{round(minutes * 60)} с" if minutes < 1 else f"{minutes:.1f} мин".replace(".", ",")


def header(ws, row, titles, widths=None):
    for i, t in enumerate(titles, start=1):
        c = ws.cell(row=row, column=i, value=t)
        c.font = BOLD
        c.fill = HEAD
        c.border = BOX
        c.alignment = WRAP
    if widths:
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = w


def cell(ws, row, col, value, font=NORMAL, fill=None):
    c = ws.cell(row=row, column=col, value=value)
    c.font = font
    c.border = BOX
    c.alignment = WRAP
    if fill:
        c.fill = fill
    return c


wb = Workbook()

# ---------- Накратко ----------
ws = wb.active
ws.title = "Накратко"
ws.column_dimensions["A"].width = 110
lines = [
    ("Zerks-X6: числата на сградите и нивата 1–25 (версия 0.1, одобрен от Жоро на 13.11.2026)", TITLE),
    ("Направено от модела в game/src/balance (npm run balance), 13.11.2026. Жоро го одобри като начало на 13.11.2026; числата се настройват, след като нивата до 100 са написани.", GREY),
    ("", NORMAL),
    ("Какво е", BOLD),
    ("levels.md казва какво иска Ковчегът за всяко ниво. Тук е останалото: колко дава всяка сграда, колко струва и колко трае всяко подобрение, колко ток харчи, колко въздух струва всеки процент атмосфера.", NORMAL),
    ("Моделът събира какво трябва за всяко ниво (Ковчегът, подобренията, новите сгради, етапите на кораба, храната на хората, суровините на пещите) и нагласява производството така, че нивото да трае около целевото време.", NORMAL),
    ("", NORMAL),
    ("Темпото", BOLD),
    ("Истинско темпо: глава 1 около 18 часа, глава 2 около 49, нивата 21–25 около 28. То следва рисърча в levels.md (на ниво 10 зоната II е 3 ч).", NORMAL),
    (f"Пробно темпо: всичко {DATA['params']['TEST_TEMPO']} пъти по-бързо, така че глава 1 е около 18 минути (Саламен: 15–20 минути). Ускорява таймерите и производството, не репликите на ЕХО и полета на дрона.", NORMAL),
    ("Смяна на темпото: сменят се числата в една таблица, не кодът. Кажи „по-бързо“ или „по-бавно“ за ниво или за глава.", NORMAL),
    ("", NORMAL),
    ("Листовете", BOLD),
    ("Нивата: целта, колко трае в модела, в пробното темпо, рисърчът и какво спира нивото.", NORMAL),
    ("Сградите: за всяка сграда и всяко ниво: цена на подобрението, време, ток, производство.", NORMAL),
    ("Атмосферата: колко въздух струва всеки процент.", NORMAL),
    ("Допускания: всичко, което не е в levels.md (одобрено като начало, настройва се).", NORMAL),
]
for i, (t, f) in enumerate(lines, start=1):
    c = ws.cell(row=i, column=1, value=t)
    c.font = f
    c.alignment = WRAP

# ---------- Нивата ----------
ws = wb.create_sheet("Нивата")
header(ws, 1, ["Ниво", "Цел", "В модела", "Пробно темпо", "Рисърч, който трябва", "Рисърч (мин)", "Подобрението на Ковчега",
               "Какво спира нивото", "Хора в края", "Атмосфера за следващото", "Ток: дава/харчи"],
       [7, 13, 13, 12, 30, 11, 13, 20, 10, 13, 13])
row = 2
for l in DATA["levels"]:
    slow = l["modelMin"] > 1.1 * l["targetMin"]
    vals = [l["L"], hm(l["targetMin"]), hm(l["modelMin"]), test_time(l["testMin"]), l["researchWhat"], l["researchMin"],
            hm(l["arkMin"]), BOTTLENECK_BG.get(l["bottleneck"], l["bottleneck"]), l["colonists"], f"{l['atmo']}%",
            f"×{l['energyRatio']:.2f}" if l["L"] >= 5 else "реакторът"]
    for c, v in enumerate(vals, start=1):
        cell(ws, row, c, v, RED if (slow and c == 3) else NORMAL)
    row += 1
ch = lambda a, b: sum(l["modelMin"] for l in DATA["levels"] if a <= l["L"] <= b)
row += 1
for label, a, b in [("Глава 1 (1–10)", 1, 10), ("Глава 2 (11–20)", 11, 20), ("Нивата 21–25", 21, 25)]:
    cell(ws, row, 1, label, BOLD)
    cell(ws, row, 3, hm(ch(a, b)), BOLD)
    cell(ws, row, 4, test_time(ch(a, b) / DATA["params"]["TEST_TEMPO"]), BOLD)
    row += 1
row += 1
ws.cell(row=row, column=1, value="Червено: нивото е над 10% по-бавно от целта. Минутите по суровини са в game (npm run balance).").font = GREY

# ---------- Сградите ----------
ws = wb.create_sheet("Сградите")
ws.column_dimensions["A"].width = 8
ws.column_dimensions["B"].width = 10
for col in range(3, 16):
    ws.column_dimensions[get_column_letter(col)].width = 12
row = 1
ws.cell(row=row, column=1, value="Цената е за подобрението от ниво n на n+1. Времето е без бонуса „По-кратки подобрения“ (−15% от ниво 8).").font = GREY
row += 2
for b in DATA["buildings"]:
    cost_keys = [k for k in RES_BG if any(k in r["upgradeCost"] for r in b["rows"])]
    prod_keys = list(b["rows"][0]["produces"].keys())
    title = f"{b['bg']} ({b['en']}) · отключва се на ниво {b['unlock']} · строеж: " + \
        ", ".join(f"{v} {RES_BG[k]}" for k, v in b["build"]["cost"].items()) + f", {b['build']['seconds'] // 60} мин {b['build']['seconds'] % 60} с"
    c = ws.cell(row=row, column=1, value=title)
    c.font = BOLD
    c.fill = BLOCK
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=3 + len(cost_keys) + len(prod_keys))
    row += 1
    titles = ["Ниво n", "→ n+1"] + [f"Цена: {RES_BG[k]}" for k in cost_keys] + ["Време (мин)", "Ток (kW)"] + [PROD_BG.get(k, k) for k in prod_keys]
    header(ws, row, titles)
    row += 1
    for r in b["rows"]:
        vals = [r["n"], r["upgradeTo"]] + [r["upgradeCost"].get(k, "") for k in cost_keys] + \
            [round(r["upgradeSeconds"] / 60, 1), r["energyKw"]] + [r["produces"].get(k, "") or "" for k in prod_keys]
        for ci, v in enumerate(vals, start=1):
            cell(ws, row, ci, v)
        row += 1
    row += 1

# ---------- Атмосферата ----------
ws = wb.create_sheet("Атмосферата")
header(ws, 1, ["От %", "До %", "Въздух за този процент", "Набира се на нивата"], [8, 8, 22, 30])
for i, a in enumerate(DATA["air"], start=2):
    for ci, v in enumerate([a["p"], a["p"] + 1, a["units"], ", ".join(str(x) for x in a["levels"])], start=1):
        cell(ws, i, ci, v)
r = len(DATA["air"]) + 3
notes = [
    "Сградите правят „въздух“ всяка минута: процесорът 1 на ниво 1, лабораторията 0,3, оранжерията 1,8; +22% на ниво до 11, после +6%.",
    "Всеки следващ процент иска повече въздух: колкото по-плътна е атмосферата, толкова повече се губи (свързва се с камъка, отлита в космоса).",
    "От 30% levels.md забавя атмосферата до 1% на 3 нива, затова процентите след 30 струват много повече.",
]
for i, t in enumerate(notes):
    c = ws.cell(row=r + i, column=1, value=t)
    c.font = GREY

# ---------- Допускания ----------
ws = wb.create_sheet("Допускания")
header(ws, 1, ["Допускане", "Стойност", "Защо"], [52, 22, 70])
p = DATA["params"]
rows = [
    ("Ковчегът харчи", "карбон, вода, камък", "concept.md: запасите се харчат и за нивата на Ковчега. Редовете „в склада“ (силиций, храна, новите материали) са запас, който се проверява."),
    ("Пробно темпо", f"×{p['TEST_TEMPO']}", "Саламен: глава 1 за 15–20 минути."),
    ("Ресурсите да са готови до", f"{round(p['RESOURCE_SHARE'] * 100)}% от нивото", "Останалото е подобрението на Ковчега."),
    ("Подобрението на Ковчега", f"{round(p['ARK_UPGRADE_SHARE'] * 100)}% от нивото", "levels.md: „отнема време“."),
    ("Цена на подобрение на сграда", "тегло × какво иска Ковчегът за ниво n+1", "Теглата са 0,03–0,07 (рисърчът 0,15); водата е 30% от тази на Ковчега. Така цената никога не минава склада."),
    ("Цена на нова сграда", "половин подобрение на нивото", "Новата сграда е на ниво 1, но се строи с днешните материали."),
    ("Време за подобрение", "20 с на ниво 1, ×1,6 на ниво до 11, после ×1,08", "Ниво 10 → 11 е около 23 мин; ниво 25 → 26 около 1 ч 48 мин."),
    ("Строеж с дрона", "1,5 подобрения, най-много около 8 мин", "Дронът винаги печата сграда на ниво 1."),
    ("Сграда без работник", "работи половината време", "levels.md: само докато играеш. В обучението (нива 1–2) и в нивото, в което я строиш, си там."),
    ("Храна на човек", f"{p['FOOD_PER_COLONIST_MIN']} на минута", "Предложение."),
    ("Роботът събирач", f"+{round(p['ROBOT_SHARE'] * 100)}% карбон и камък", "Предложение; колко често и колко носи е отворено в levels.md."),
    ("Нощта", f"{p['NIGHT_MIN']} мин от 20-минутния ден", "levels.md: денонощието е около 20 мин; нощем машините дават 5% по-малко."),
    ("Семената", "картофи ×1,25, боб ×1,25, пшеница ×1,2", "Новото семе дава повече храна."),
    ("Оранжерията дава храна", "от своето ниво 16, ¼ от лабораторията", "levels.md: от ниво 16; количеството е предложение."),
    ("Ток", "kW на ниво 1, +12% на ниво", "Пещта 12, топилнята 20, оранжерията 5, другите 0,5–4. Панелите дават 1,8 пъти разхода от ниво 7."),
    ("Реакторът на Ковчега", "всичко до ниво 4; на 5–6 колкото се е харчило при ниво 5; от 7 нищо", "Жоро, 14.11.2026 (levels.md 2.5), както в Unity: новото иска панели. Дотогава моделът имаше 50% и 25%."),
    ("Рецептите", "силиций = 2 кварц + 1 карбон; стомана = 2 желязо + 1 карбон; тухла = 2 глина; кабел = 2 мед + 1 карбон", "По процесите в levels.md."),
    ("Целевите времена", "глава 1 около 18 ч", "Следват рисърча; нивата с дълъг чертеж и нов материал (5, 8, 11, 13, 15, 17–20) са по-дълги."),
]
for i, (a, b, c) in enumerate(rows, start=2):
    cell(ws, i, 1, a)
    cell(ws, i, 2, b)
    cell(ws, i, 3, c)

for s in wb.worksheets:
    s.sheet_view.zoomScale = 110
wb.save(OUT)
print("Записано:", OUT)
