# Builds docs/revenue/Zerks-X6-revenue-100k.xlsx: an example of revenue and costs for 100,000 downloads.
# The inputs (yellow cells) can be changed in Excel or Numbers; everything else is a formula.
# It also prints the same results, computed here, for docs/revenue-model.md.
#   python3 docs/revenue/make-revenue-xlsx.py
import math
import os

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Zerks-X6-revenue-100k.xlsx")
DAYS = 365

F = "Arial"
TITLE = Font(name=F, bold=True, size=14)
BOLD = Font(name=F, bold=True)
NORMAL = Font(name=F)
GREY = Font(name=F, italic=True, color="5A6478")
HEAD = PatternFill("solid", fgColor="E8ECF5")
INPUT = PatternFill("solid", fgColor="FFF4C2")
RESULT = PatternFill("solid", fgColor="E3F4E8")
thin = Side(style="thin", color="C9D0DE")
BOX = Border(top=thin, bottom=thin, left=thin, right=thin)
WRAP = Alignment(wrap_text=True, vertical="top")

SCEN = ["Слаб", "Среден", "Силен"]

# (key, label, values for the three scenarios, number format, note)
INPUTS = [
    ("installs", "Изтегляния за първата година", [100000, 100000, 100000], "#,##0", "По молба на Жоро"),
    ("d1", "Задържане D1", [0.22, 0.35, 0.45], "0%", "Слаб: медианата на всички мобилни игри (GameAnalytics 2026); среден: нашата цел; силен: горните 10% idle (2020)"),
    ("d7", "Задържане D7", [0.04, 0.10, 0.15], "0%", "Слаб: медианата (под 4%); среден и силен: над горната четвъртина (7–8%)"),
    ("d30", "Задържане D30", [0.008, 0.03, 0.05], "0.0%", "Слаб: медианата 0,7–0,8%"),
    ("ads", "Реклами с награда на активен играч на ден", [0.6, 1.2, 2.0], "0.0", "Kongregate: 30% от играчите × ~4 реклами = 1,2; таванът ни е 10 на ден"),
    ("ecpm", "Приход за 1000 реклами (eCPM), нето, $", [4, 8, 14], "0.00", "САЩ ~$16–20, Европа ~$5–9, Бразилия ~$1–3; смесено по сценарий (моя оценка)"),
    ("payers", "Платили (дял от изтеглянията)", [0.005, 0.015, 0.03], "0.0%", "1–3% платили при казуалните игри (блогове, непотвърдено)"),
    ("arppu", "Средно платено от един платил за цялото време, $", [4, 7, 12], "0.00", "Казуални: около $7 за 90 дни (Playio, 2026)"),
    ("storefee", "Такса на магазина за покупките", [0.15, 0.15, 0.15], "0%", "Apple 15% (Small Business); Google 10% + 5% за плащането (от 30.06.2026)"),
    ("paid", "Платени изтегляния (дял)", [0, 0, 0], "0%", "0 = всички идват сами; сменете, за да видите цената на рекламата"),
    ("cpi", "Цена на едно платено изтегляне (CPI), $", [0.53, 0.53, 0.53], "0.00", "Европа, всички жанрове: $0,53 (Adjust 2025); симулации в САЩ: $2,50–3,75"),
    ("fx", "Долара за 1 евро", [1.10, 1.10, 1.10], "0.00", "Около 1,10 в средата на ноември 2026 (Trading Economics)"),
]

# Fixed costs for the first year, in euro (same in all scenarios)
FIXED = [
    ("Apple Developer Program ($99 на година)", 90, "$99 / 1,10"),
    ("Google Play (веднъж $25)", 23, "$25 / 1,10"),
    ("Регистрация на фирма (ООД)", 28, "Около €28 онлайн (непотвърдено, от плана за кода)"),
    ("Счетоводител, 12 месеца", 1500, "€100–150 на месец за малко ЕООД без ДДС (Innovires, 2026)"),
    ("Домейн и страница за политиката за поверителност", 15, "Моя оценка"),
    ("Unity Personal", 0, "Безплатно до $200 000 приход за 12 месеца (Unity, 2026)"),
    ("Рекламна мрежа, статистика, известия", 0, "AdMob или LevelPlay, GameAnalytics/Firebase: безплатни"),
]
CORP_TAX = 0.10
DIV_TAX = 0.05


def retention(d, d1, d7, d30):
    """Piecewise power law through D1, D7 and D30; after D30 it keeps the D7→D30 slope."""
    if d <= 7:
        b = math.log(d7 / d1) / math.log(7)
        return d1 * d ** b
    b = math.log(d30 / d7) / math.log(30 / 7)
    if d <= 30:
        return d7 * (d / 7) ** b
    return d30 * (d / 30) ** b


def compute(i):
    v = {k: vals[i] for k, _, vals, _, _ in INPUTS}
    days = 1 + sum(retention(d, v["d1"], v["d7"], v["d30"]) for d in range(1, DAYS + 1))
    ads_usd = v["installs"] * days * v["ads"] * v["ecpm"] / 1000
    iap_gross = v["installs"] * v["payers"] * v["arppu"]
    iap_net = iap_gross * (1 - v["storefee"])
    rev_usd = ads_usd + iap_net
    rev_eur = rev_usd / v["fx"]
    ua_eur = v["installs"] * v["paid"] * v["cpi"] / v["fx"]
    fixed = sum(x[1] for x in FIXED)
    profit = rev_eur - ua_eur - fixed
    tax = max(profit, 0) * CORP_TAX
    after = profit - tax
    div = max(after, 0) * (1 - DIV_TAX)
    return dict(days=days, dau_days=v["installs"] * days, ads_usd=ads_usd, iap_gross=iap_gross, iap_net=iap_net,
                rev_usd=rev_usd, rev_eur=rev_eur, per_install=rev_usd / v["installs"], ua_eur=ua_eur, fixed=fixed,
                profit=profit, tax=tax, after=after, div=div, each=div / 2)


def build():
    wb = Workbook()
    ws = wb.active
    ws.title = "Модел"
    ws.column_dimensions["A"].width = 52
    for c in "BCD":
        ws.column_dimensions[c].width = 14
    ws.column_dimensions["E"].width = 70

    ws["A1"] = "Zerks-X6: приход и разход при 100 000 изтегляния (пример)"
    ws["A1"].font = TITLE
    ws["A2"] = "Жълтите клетки се сменят; останалото се смята само. Всичко е оценка за първите 12 месеца, не прогноза."
    ws["A2"].font = GREY

    r = 4
    for col, name in zip("ABCDE", ["Предположение", *SCEN, "Откъде"]):
        c = ws[f"{col}{r}"]
        c.value = name
        c.font = BOLD
        c.fill = HEAD
        c.border = BOX
    ref = {}
    for key, label, vals, fmt, note in INPUTS:
        r += 1
        ws[f"A{r}"] = label
        ws[f"A{r}"].border = BOX
        for col, val in zip("BCD", vals):
            c = ws[f"{col}{r}"]
            c.value = val
            c.number_format = fmt
            c.fill = INPUT
            c.border = BOX
        ws[f"E{r}"] = note
        ws[f"E{r}"].font = GREY
        ws[f"E{r}"].alignment = WRAP
        ref[key] = r

    # Retention sheet with formulas, day by day
    rs = wb.create_sheet("Задържане")
    rs["A1"] = "Ден"
    rs["A1"].font = BOLD
    for j, (col, name) in enumerate(zip("BCD", SCEN)):
        rs[f"{col}1"] = name
        rs[f"{col}1"].font = BOLD
    rs["A2"] = 0
    for col in "BCD":
        rs[f"{col}2"] = 1
    for d in range(1, DAYS + 1):
        row = d + 2
        rs[f"A{row}"] = d
        for col in "BCD":
            m = f"Модел!{col}"
            d1, d7, d30 = f"{m}${ref['d1']}", f"{m}${ref['d7']}", f"{m}${ref['d30']}"
            if d <= 7:
                f = f"={d1}*A{row}^(LN({d7}/{d1})/LN(7))"
            elif d <= 30:
                f = f"={d7}*(A{row}/7)^(LN({d30}/{d7})/LN(30/7))"
            else:
                f = f"={d30}*(A{row}/30)^(LN({d30}/{d7})/LN(30/7))"
            rs[f"{col}{row}"] = f
            rs[f"{col}{row}"].number_format = "0.00%"
    last = DAYS + 2

    r += 2
    ws[f"A{r}"] = "Резултат"
    ws[f"A{r}"].font = BOLD
    ws[f"A{r}"].fill = HEAD
    rows = {}

    def out(key, label, formula, fmt):
        nonlocal r
        r += 1
        ws[f"A{r}"] = label
        ws[f"A{r}"].border = BOX
        for col in "BCD":
            c = ws[f"{col}{r}"]
            c.value = formula(col)
            c.number_format = fmt
            c.fill = RESULT
            c.border = BOX
        rows[key] = r

    I = lambda k: lambda col: f"{col}{ref[k]}"
    out("days", "Активни дни на едно изтегляне (за 12 месеца)", lambda col: f"=SUM(Задържане!{col}2:{col}{last})", "0.0")
    out("ads", "Приход от реклами, $", lambda col: f"={col}{ref['installs']}*{col}{rows['days']}*{col}{ref['ads']}*{col}{ref['ecpm']}/1000", "#,##0")
    out("iapg", "Покупки, преди таксата на магазина, $", lambda col: f"={col}{ref['installs']}*{col}{ref['payers']}*{col}{ref['arppu']}", "#,##0")
    out("iapn", "Покупки, след таксата на магазина, $", lambda col: f"={col}{rows['iapg']}*(1-{col}{ref['storefee']})", "#,##0")
    out("rev", "Приход общо, $", lambda col: f"={col}{rows['ads']}+{col}{rows['iapn']}", "#,##0")
    out("reve", "Приход общо, €", lambda col: f"={col}{rows['rev']}/{col}{ref['fx']}", "#,##0")
    out("pi", "Приход на едно изтегляне, $", lambda col: f"={col}{rows['rev']}/{col}{ref['installs']}", "0.000")
    out("ua", "Платени изтегляния, €", lambda col: f"={col}{ref['installs']}*{col}{ref['paid']}*{col}{ref['cpi']}/{col}{ref['fx']}", "#,##0")
    fixed_sum = sum(x[1] for x in FIXED)
    out("fixed", "Постоянни разходи за годината, € (долу)", lambda col: f"={fixed_sum}", "#,##0")
    out("profit", "Печалба преди данък, €", lambda col: f"={col}{rows['reve']}-{col}{rows['ua']}-{col}{rows['fixed']}", "#,##0")
    out("tax", "Корпоративен данък 10%, €", lambda col: f"=MAX({col}{rows['profit']},0)*{CORP_TAX}", "#,##0")
    out("after", "Печалба след данък, €", lambda col: f"={col}{rows['profit']}-{col}{rows['tax']}", "#,##0")
    out("div", "За двамата след данъка върху дивидента 5%, €", lambda col: f"=MAX({col}{rows['after']},0)*(1-{DIV_TAX})", "#,##0")
    out("each", "На човек, €", lambda col: f"={col}{rows['div']}/2", "#,##0")

    r += 2
    ws[f"A{r}"] = "Постоянни разходи за първата година"
    ws[f"A{r}"].font = BOLD
    ws[f"A{r}"].fill = HEAD
    for name, eur, note in FIXED:
        r += 1
        ws[f"A{r}"] = name
        ws[f"B{r}"] = eur
        ws[f"B{r}"].number_format = "#,##0 €"
        ws[f"E{r}"] = note
        ws[f"E{r}"].font = GREY
    r += 2
    ws[f"A{r}"] = ("Не са включени: вашето време, телефон с Android за проби, музика и звуци, ДДС (регистрация при оборот над €50 000), "
                   "американският данък при източника, който се урежда с формуляр W-8BEN.")
    ws[f"A{r}"].font = GREY
    ws.freeze_panes = "B5"
    wb.save(OUT)


if __name__ == "__main__":
    build()
    for i, name in enumerate(SCEN):
        res = compute(i)
        print(name, {k: round(v, 3) for k, v in res.items()})
    print("saved", OUT)
