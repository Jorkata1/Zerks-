# Builds docs/example/Zerks-X6-economy-example.xlsx: a model of the economy to level 100, variant A (current rules)
# and variant B (example). It writes formulas only; Excel or LibreOffice computes them on open.
#   python3 docs/example/make-economy-xlsx.py docs/example/Zerks-X6-economy-example.xlsx
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = sys.argv[1]
F = "Arial"
BLUE = Font(name=F, color="0000FF")
BLACK = Font(name=F)
GREEN = Font(name=F, color="008000")
BOLD = Font(name=F, bold=True)
TITLE = Font(name=F, bold=True, size=14)
HEAD_FILL = PatternFill("solid", fgColor="E8ECF5")
YELLOW = PatternFill("solid", fgColor="FFFF00")
thin = Side(style="thin", color="C9D0DE")
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
WRAP = Alignment(wrap_text=True, vertical="top")

wb = Workbook()

# ---------- Допускания ----------
d = wb.active
d.title = "Допускания"
d["A1"] = "Zerks-X6: икономиката до ниво 100 (ПРИМЕР, не е решение)"; d["A1"].font = TITLE
d["A2"] = "Сините числа се сменят; жълтите са главните допускания. Всичко в другите листове се смята от тях."; d["A2"].font = Font(name=F, italic=True, color="5A6478")
for c, t in zip("ABC", ["Допускане", "Стойност", "Откъде"]):
    d[f"{c}3"] = t; d[f"{c}3"].font = BOLD; d[f"{c}3"].fill = HEAD_FILL; d[f"{c}3"].border = BOX
P = [  # row, label, value, fmt, note, key
 (4, "Растеж на ресурсите на ниво, вариант A", 1.4, "0.00", "levels.md: сегашното правило (от ниво 8; до 7 е ×2)", True),
 (5, "Растеж на ресурсите на ниво след ниво 11, вариант B", 1.1, "0.00", "Пример: до около 100 милиона на ниво 100, без милиарди (Пацо, 07.11.2026)", True),
 (6, "Складът на ниво 1 побира", 1000, "#,##0", "levels.md (Жоро, 04.11.2026)", False),
 (7, "Ковчегът побира", 1000, "#,##0", "levels.md (Жоро, 04.11.2026)", False),
 (8, "Атмосфера на ниво 1", 0.07, "0%", "levels.md", False),
 (9, "Атмосфера: стъпка за нива 2–4", 0.03, "0%", "levels.md", False),
 (10, "Атмосфера: стъпка след ниво 4, вариант A", 0.02, "0%", "levels.md", True),
 (11, "Задължителни подобрения на ниво, вариант B", 4, "0", "Предложение: складът, домът, сградата за храна и една ключова сграда, по +1", True),
 (12, "До кое ниво се вдига нова сграда, вариант B", 5, "0", "Предложение", True),
 (13, "Дълги подобрения на ден", 10, "0", "Допускане: 2 строителни дрона и около 5 влизания на ден", True),
 (14, "Дните се броят от ниво", 11, "0", "В глава 1 подобренията са кратки и се пускат едно след друго", False),
 (15, "Доброволни подобрения във вариант B (пъти повече от задължителните)", 2.5, "0.0", "Груба оценка на Claude", True),
 (16, "Подобрения на дома и сградата за храна на ниво", 2, "0", "Домът и храната вървят с хората: по едно място на ниво", False),
 (17, "Домът и храната се подобряват от ниво", 3, "0", "levels.md", False),
]
for r, lab, val, fmt, note, key in P:
    d[f"A{r}"] = lab; d[f"A{r}"].font = BLACK
    d[f"B{r}"] = val; d[f"B{r}"].font = BLUE; d[f"B{r}"].number_format = fmt
    if key: d[f"B{r}"].fill = YELLOW
    d[f"C{r}"] = note; d[f"C{r}"].font = BLACK
    for c in "ABC": d[f"{c}{r}"].border = BOX; d[f"{c}{r}"].alignment = WRAP
d["A19"] = "Атмосфера в края на главата, вариант B (по таблицата на главите в концепцията)"; d["A19"].font = BOLD
d["A20"] = "Ниво"; d["B20"] = "Атмосфера"
for c in "AB": d[f"{c}20"].font = BOLD; d[f"{c}20"].fill = HEAD_FILL; d[f"{c}20"].border = BOX
targets = [28, 35, 45, 55, 62, 70, 80, 90, 95, 100]
for i, t in enumerate(targets):
    r = 21 + i
    d[f"A{r}"] = 10 * (i + 1); d[f"A{r}"].font = BLACK
    d[f"B{r}"] = t / 100; d[f"B{r}"].font = BLUE; d[f"B{r}"].number_format = "0%"
    for c in "AB": d[f"{c}{r}"].border = BOX
d["C21"] = "Ниво 10 е от levels.md, другите са примерни от концепцията"; d["C21"].font = BLACK
d.column_dimensions["A"].width = 52; d.column_dimensions["B"].width = 12; d.column_dimensions["C"].width = 70
TG = "'Допускания'!$B$21:$B$30"
def p(r): return f"'Допускания'!$B${r}"

# ---------- Сгради ----------
s = wb.create_sheet("Сгради")
s["A1"] = "Сгради, които следват нивото на Ковчега"; s["A1"].font = TITLE
s["A2"] = "Без Ковчега, рисърча, домовете и сградите за храна. Нивото на поява е синьо и се сменя."; s["A2"].font = Font(name=F, italic=True, color="5A6478")
heads = ["Сграда", "Ниво на поява", "Глава", "Откъде"]
for i, h in enumerate(heads):
    c = s.cell(row=3, column=i + 1, value=h); c.font = BOLD; c.fill = HEAD_FILL; c.border = BOX
B = [
 ("Геолокатор",1,"levels.md"),("Карбонова сонда",1,"levels.md"),("Помпа за вода",1,"levels.md"),("Атмосферен процесор",1,"levels.md"),
 ("Лаборатория за зеленчуци",1,"levels.md"),("Мина",2,"levels.md"),("Склад",4,"levels.md"),("Силициева пещ",5,"levels.md"),
 ("Слънчеви панели",5,"levels.md"),("Батерии",7,"levels.md"),("Оранжерия",8,"levels.md"),
 ("Топилня",11,"Концепцията, глава 2; нивото е примерно"),("Втора оранжерия",11,"Концепцията, глава 2; нивото е примерно"),
 ("Глинен изкоп",13,"Концепцията, глава 2; нивото е примерно"),("Пещ за тухли",14,"Концепцията, глава 2; нивото е примерно"),
 ("Ниви",21,"Концепцията, глава 3"),("Горски разсадник",22,"Концепцията, глава 3"),("Горска станция",24,"Концепцията, глава 3"),
 ("Дъскорезница",25,"Концепцията, глава 3"),("Комуникационна кула",27,"Концепцията, глава 3"),
 ("Лаборатория за животни",31,"Концепцията, глава 4"),("Рибарник",33,"Концепцията, глава 4"),("Курник",34,"Концепцията, глава 4"),
 ("Щитов генератор",35,"Концепцията, глава 4"),("Пречиствателна станция",37,"Концепцията, глава 4"),("Медицински пункт",38,"Концепцията, глава 4"),
 ("Кошари",41,"Концепцията, глава 5"),("Пасища",42,"Концепцията, глава 5"),("Цех за мед",44,"Концепцията, глава 5"),("Ветрогенератори",46,"Концепцията, глава 5"),
 ("Училище",51,"Концепцията, глава 6"),("Паркове",53,"Концепцията, глава 6"),("Дронове за пренасяне",55,"Концепцията, глава 6"),
 ("Кристален добив",57,"Концепцията, глава 6"),("Совалкова площадка",59,"Концепцията, глава 6"),
 ("Лунна база",61,"Концепцията, глава 7"),("Лунна мина",61,"Концепцията, глава 7"),("Реактор",63,"Концепцията, глава 7"),
 ("Големи топилни",65,"Концепцията, глава 7"),("Цехове",67,"Концепцията, глава 7"),("Корабостроителница",71,"Концепцията, глава 8"),
]
for i, (name, lvl, src) in enumerate(B):
    r = 4 + i
    s.cell(row=r, column=1, value=name).font = BLACK
    c = s.cell(row=r, column=2, value=lvl); c.font = BLUE
    s.cell(row=r, column=3, value=f"=INT((B{r}-1)/10)+1").font = BLACK
    s.cell(row=r, column=4, value=src).font = BLACK
    for col in range(1, 5): s.cell(row=r, column=col).border = BOX
last = 4 + len(B) - 1
s.cell(row=last + 2, column=1, value="Празните редове отдолу са за нови сгради: впиши име и ниво.").font = Font(name=F, italic=True, color="5A6478")
for col, w in zip("ABCD", [30, 15, 9, 44]): s.column_dimensions[col].width = w
RNG = "'Сгради'!$B$4:$B$120"

# ---------- Нива ----------
n = wb.create_sheet("Нива")
n["A1"] = "Нивата 1–100: вариант A (сегашните правила) и вариант B (предложението)"; n["A1"].font = TITLE
n["A2"] = "Задължителните подобрения са за пътя от това ниво до следващото. Карбонът е изискването за това ниво."; n["A2"].font = Font(name=F, italic=True, color="5A6478")
H = ["Ниво","Глава","Будни колонисти","Домове","Сгради","Нови сгради",
     "Атмосфера A","Атмосфера B","Карбон A","Карбон B","Склад и Ковчег A","Склад и Ковчег B",
     "Подобрения A","Подобрения B","Дни A","Дни B","Дни B с доброволни",
     "Подобрения A общо","Подобрения B общо","Дни A общо","Дни B с доброволни общо"]
for i, h in enumerate(H):
    c = n.cell(row=3, column=i + 1, value=h); c.font = BOLD; c.fill = HEAD_FILL; c.border = BOX; c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
ch1_carbon = [0, 150, 350, 700, 1400, 2800, 5600, 7800, 10900, 15300]
FIRST = 4
for L in range(1, 101):
    r = FIRST + L - 1
    A = f"A{r}"
    n[A] = L
    n[f"B{r}"] = f"=INT(({A}-1)/10)+1"
    n[f"C{r}"] = f"=IF({A}<4,0,{A})"
    n[f"D{r}"] = f"=IF(C{r}=0,IF({A}=3,1,0),ROUNDUP(C{r}/20,0))"
    n[f"E{r}"] = f'=COUNTIF({RNG},"<="&{A})'
    n[f"F{r}"] = f"=COUNTIF({RNG},{A})"
    n[f"G{r}"] = f"=MIN(1,IF({A}=1,{p(8)},IF({A}<=4,{p(8)}+{p(9)}*({A}-1),{p(8)}+3*{p(9)}+{p(10)}*({A}-4))))"
    n[f"H{r}"] = (f"=IF({A}<=10,G{r},INDEX({TG},INT(({A}-1)/10))+(INDEX({TG},INT(({A}-1)/10)+1)-INDEX({TG},INT(({A}-1)/10)))*({A}-10*INT(({A}-1)/10))/10)")
    if L <= 10:
        n[f"I{r}"] = ch1_carbon[L - 1]; n[f"I{r}"].font = BLUE
    else:
        n[f"I{r}"] = f"=$I${FIRST+9}*{p(4)}^({A}-10)"
    n[f"J{r}"] = f"=IF({A}<=11,I{r},$I${FIRST+10}*{p(5)}^({A}-11))"
    n[f"K{r}"] = f"=IF({A}<4,{p(7)},{p(6)}*{p(4)}^({A}-1)+{p(7)})"
    n[f"L{r}"] = f"=IF({A}<=11,K{r},{p(6)}*{p(4)}^10*{p(5)}^({A}-11)+{p(7)})"
    n[f"M{r}"] = f"=IF({A}>=100,0,(E{r}-F{r})+F{r}*{A}+IF({A}>={p(17)},{p(16)},0))"
    n[f"N{r}"] = f"=IF({A}>=100,0,IF({A}<=10,M{r},{p(11)}+F{r}*({p(12)}-1)))"
    n[f"O{r}"] = f"=IF({A}>={p(14)},M{r}/{p(13)},0)"
    n[f"P{r}"] = f"=IF({A}>={p(14)},N{r}/{p(13)},0)"
    n[f"Q{r}"] = f"=P{r}*{p(15)}"
    n[f"R{r}"] = f"=SUM($M${FIRST}:M{r})"
    n[f"S{r}"] = f"=SUM($N${FIRST}:N{r})"
    n[f"T{r}"] = f"=SUM($O${FIRST}:O{r})"
    n[f"U{r}"] = f"=SUM($Q${FIRST}:Q{r})"
    for col in range(1, 22):
        c = n.cell(row=r, column=col); c.border = BOX
        if c.font != BLUE: c.font = BLACK
    for col in "GH": n[f"{col}{r}"].number_format = "0%"
    for col in "IJKL": n[f"{col}{r}"].number_format = "#,##0"
    for col in "OPQTU": n[f"{col}{r}"].number_format = "0.0"
    if L % 10 == 0:
        for col in range(1, 22): n.cell(row=r, column=col).fill = PatternFill("solid", fgColor="FDF1E7")
widths = [7,7,10,8,8,8,11,11,26,16,26,16,12,12,8,8,11,12,12,10,12]
for i, w in enumerate(widths): n.column_dimensions[get_column_letter(i + 1)].width = w
n.row_dimensions[3].height = 45
n.freeze_panes = "B4"
LASTN = FIRST + 99

# ---------- Глави ----------
g = wb.create_sheet("Глави", 0)
g["A1"] = "Zerks-X6: главите до ниво 100, вариант A и вариант B (ПРИМЕР, не е решение)"; g["A1"].font = TITLE
g["A2"] = "A: всички сгради на нивото на Ковчега, ресурсите ×1,4 на ниво, атмосферата +2% на ниво. B: глава 1 както е; после 4 задължителни подобрения на ниво, ресурсите ×1,1 след ниво 11, атмосферата по главите."
g["A2"].font = Font(name=F, italic=True, color="5A6478")
GH = ["Глава","Нива","Колонисти в края","Сгради в края","Подобрения A","Подобрения B","Дни A","Дни B","Дни B с доброволни",
      "Карбон за края A","Карбон за края B","Атмосфера A","Атмосфера B"]
for i, h in enumerate(GH):
    c = g.cell(row=4, column=i + 1, value=h); c.font = BOLD; c.fill = HEAD_FILL; c.border = BOX; c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
NR = lambda col: f"'Нива'!${col}${FIRST}:${col}${LASTN}"
for ch in range(1, 11):
    r = 4 + ch
    g[f"A{r}"] = ch
    g[f"B{r}"] = f"{10*ch-9}–{10*ch}"
    endrow = FIRST + 10 * ch - 1
    g[f"C{r}"] = f"='Нива'!C{endrow}"
    g[f"D{r}"] = f"='Нива'!E{endrow}"
    g[f"E{r}"] = f"=SUMIFS({NR('M')},{NR('B')},A{r})"
    g[f"F{r}"] = f"=SUMIFS({NR('N')},{NR('B')},A{r})"
    g[f"G{r}"] = f"=SUMIFS({NR('O')},{NR('B')},A{r})"
    g[f"H{r}"] = f"=SUMIFS({NR('P')},{NR('B')},A{r})"
    g[f"I{r}"] = f"=SUMIFS({NR('Q')},{NR('B')},A{r})"
    g[f"J{r}"] = f"='Нива'!I{endrow}"
    g[f"K{r}"] = f"='Нива'!J{endrow}"
    g[f"L{r}"] = f"='Нива'!G{endrow}"
    g[f"M{r}"] = f"='Нива'!H{endrow}"
    for col in range(1, 14):
        c = g.cell(row=r, column=col); c.border = BOX
        c.font = GREEN if col in (3, 4, 10, 11, 12, 13) else BLACK
    for col in "GHI": g[f"{col}{r}"].number_format = "0"
    for col in "JK": g[f"{col}{r}"].number_format = "#,##0"
    for col in "LM": g[f"{col}{r}"].number_format = "0%"
t = 15
g[f"A{t}"] = "Общо"; g[f"A{t}"].font = BOLD
for col in "EFGHI":
    g[f"{col}{t}"] = f"=SUM({col}5:{col}14)"; g[f"{col}{t}"].font = BOLD; g[f"{col}{t}"].number_format = "#,##0"
g[f"A{t+1}"] = "В месеци"; g[f"A{t+1}"].font = BOLD
for col in "GHI":
    g[f"{col}{t+1}"] = f"={col}{t}/30"; g[f"{col}{t+1}"].font = BOLD; g[f"{col}{t+1}"].number_format = "0.0"
for row in (t, t + 1):
    for col in range(1, 14): g.cell(row=row, column=col).border = BOX
notes = [
 "Как се чете:",
 "• Подобренията са само задължителните за следващото ниво. Сградите за производство играчът подобрява и сам.",
 "• Дните са при „Дълги подобрения на ден“ от листа Допускания; в глава 1 не се броят. Трупането на ресурси и рисърчът не са вътре, защото не са решени.",
 "• Сградите в главите 2–10 и нивото им на поява са в листа Сгради; нивото в главата е примерно.",
 "• Зелените клетки идват от листа Нива, черните са формули, сините в другите листове се сменят.",
]
for i, line in enumerate(notes):
    c = g.cell(row=t + 3 + i, column=1, value=line); c.font = BOLD if i == 0 else BLACK
gw = [8,9,11,10,12,12,8,8,11,26,16,11,11]
for i, w in enumerate(gw): g.column_dimensions[get_column_letter(i + 1)].width = w
g.row_dimensions[4].height = 45
g.freeze_panes = "A5"

wb.save(OUT)
print("saved", OUT)
