# Genera el mundo del nivel 5 (campo rural entre Francia y Bélgica, de mundo libre, con montañas) y lo mete en index.html.
# Una sola fuente de geometría: este script escribe el camino, las trece paradas, el desvío cerrado, la garita, la rejilla
# de colisiones y todo el decorado. No se publica (scripts/ no se commitea). Uso:  python scripts/genera_mundo_nivel5.py
import math, os, random, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from edificios2_nivel5 import PARADAS_ED, ESC
from decorado2_nivel5 import SIM2, colina, corazon_puntos

HTML = os.path.join(AQUI, '..', 'site', 'index.html')
UI = open(os.path.join(AQUI, 'ui_nivel5.html'), encoding='utf-8').read()

W, H = 3600, 2000
CELDA = 12
COLS, FILAS = W // CELDA + 1, H // CELDA + 1
R_COCHE = 22
X_FRONTERA = 3340
MURO_NORTE = 436     # al norte de esta línea todo son montañas
random.seed(8613)

# ------------------------------------------------------------------ utilidades
def r1(v): return ('%.1f' % v).rstrip('0').rstrip('.')

def catmull(pts, sub=8):
    out, P = [], [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for s in range(sub):
            t = s / sub; t2 = t * t; t3 = t2 * t
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)))
    out.append(pts[-1])
    return out

def densificar(pts, paso):
    out = [pts[0]]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(math.ceil(math.hypot(x1 - x0, y1 - y0) / paso)))
        for k in range(1, n + 1): out.append((x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n))
    return out

class Cubo:
    """Distancia al punto más cercano de una lista, con casillas para no recorrerla entera."""
    def __init__(s, pts, tam=120):
        s.t, s.b = tam, {}
        for p in pts: s.b.setdefault((int(p[0] // tam), int(p[1] // tam)), []).append(p)
    def dist(s, x, y, rmax=260):
        n = int(rmax // s.t) + 1; cx, cy = int(x // s.t), int(y // s.t); mejor = rmax * rmax
        for i in range(cx - n, cx + n + 1):
            for j in range(cy - n, cy + n + 1):
                for (px, py) in s.b.get((i, j), ()):
                    d = (px - x) ** 2 + (py - y) ** 2
                    if d < mejor: mejor = d
        return math.sqrt(mejor)

# ------------------------------------------------------------------ camino de tierra (en serpiente)
A, B, C = 1640, 1130, 620
XR, XL, RX = 2900, 700, 300
def fila(x0, x1, y0, fase, paso=190, amp=50, aplana=None):
    pts, n = [], max(2, int(abs(x1 - x0) / paso))
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        ventana = min(1.0, k / 1.0, (n - k) / 1.0)
        ruido = amp * math.sin(k * 1.1 + fase) + 0.4 * amp * math.sin(k * 2.3 + fase * 2)
        if aplana: ruido *= max(0.0, min(1.0, (aplana - x) / 320))
        pts.append((x, y0 + ruido * ventana))
    return pts
ruta = fila(-140, XR, A, 0.3)
ruta += [(XR + RX * math.cos(t), (A + B) / 2 + (A - B) / 2 * math.sin(t)) for t in [math.pi / 2 - math.pi * k / 8 for k in range(1, 8)]]
ruta += fila(XR, XL, B, 1.7)
ruta += [(XL + RX * math.cos(t), (B + C) / 2 + (B - C) / 2 * math.sin(t)) for t in [math.pi / 2 + math.pi * k / 8 for k in range(1, 8)]]
ruta += fila(XL, 3720, C, 2.4, aplana=3120)
suave = catmull(ruta, 8)
densos = densificar(suave, 12)
d_camino = 'M' + ' L'.join(r1(x) + ' ' + r1(y) for x, y in suave)
attr_puntos = ' '.join(r1(x) + ',' + r1(y) for x, y in densos)
cubo_camino = Cubo(densos)
def d_camino_a(x, y, rmax=260): return cubo_camino.dist(x, y, rmax)

def desplazada(pts, d):
    out = []
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1
        out.append((x - ty / l * d, y + tx / l * d))
    return out
surco_a = 'M' + ' L'.join(r1(x) + ' ' + r1(y) for x, y in desplazada(densos[::2], 13))
surco_b = 'M' + ' L'.join(r1(x) + ' ' + r1(y) for x, y in desplazada(densos[::2], -13))

# ------------------------------------------------------------------ río (nace en el lago de las montañas)
RIO = [(1480, 420), (1540, 600), (1470, 830), (1550, 1060), (1480, 1300), (1565, 1520), (1500, 1760), (1545, 1940), (1490, 2100)]
rio_s = catmull(RIO, 10)
rio_d = 'M' + ' L'.join(r1(x) + ' ' + r1(y) for x, y in rio_s)
rio_densos = densificar(rio_s, 8)
cubo_rio = Cubo(rio_densos)
ANCHO_RIO = 36
def d_rio_a(x, y, rmax=200): return cubo_rio.dist(x, y, rmax)

puentes, grupo = [], []
for i, (x, y) in enumerate(densos):
    if d_rio_a(x, y, 80) < 56: grupo.append(i)
    elif grupo:
        puentes.append(grupo); grupo = []
if grupo: puentes.append(grupo)
puentes_geo = []
for g in puentes:
    i = g[len(g) // 2]; x, y = densos[i]; a, b = densos[max(0, i - 3)], densos[min(len(densos) - 1, i + 3)]
    puentes_geo.append((x, y, math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))))

# ------------------------------------------------------------------ las trece paradas y la garita
FILA_Y = {'A': A, 'B': B, 'C': C}
PARADAS = [('A', 480), ('A', 880), ('A', 1250), ('A', 1900), ('A', 2400), ('B', 2650), ('B', 2200), ('B', 1800), ('B', 1150), ('C', 880), ('C', 1250), ('C', 1900), ('C', 2500)]
N = len(PARADAS)
FUTURO_DESDE = 11
spots = []
for f, sx in PARADAS:
    cand = [p for p in densos if abs(p[1] - FILA_Y[f]) < 140 and 150 < p[0] < X_FRONTERA - 300]
    spots.append(min(cand, key=lambda p: abs(p[0] - sx)))
puerta_y = min((p for p in densos if p[0] > 3100), key=lambda p: abs(p[0] - X_FRONTERA))[1]
PUERTA = (X_FRONTERA - 80, puerta_y)

# desvío cerrado: un caminito que sale hacia el norte justo antes de la frontera
i0 = min(range(len(densos)), key=lambda i: abs(densos[i][0] - 3040) + abs(densos[i][1] - C) * 0.1)
P0 = densos[i0]
spur_pts = [(P0[0], P0[1]), (P0[0] + 8, P0[1] - 50), (P0[0] + 36, P0[1] - 100), (P0[0] + 60, P0[1] - 160)]
spur_s = catmull(spur_pts, 8)
spur_densos = densificar(spur_s, 12)
d_spur = 'M' + ' L'.join(r1(x) + ' ' + r1(y) for x, y in spur_s)
attr_spur = ' '.join(r1(x) + ',' + r1(y) for x, y in spur_densos)
BX, BY = spur_pts[2]
DESVIO = (spur_pts[1][0], spur_pts[1][1])

# ------------------------------------------------------------------ mundo: sólidos, ocupados y objetos
solidos = []   # ('c', x, y, r) | ('r', x0, y0, x1, y1)
ocupados = []  # (x, y, r)
rects_campo = []  # (x0, y0, x1, y1): los campos ya colocados
items = []     # (y de orden, svg)
def sol_c(x, y, r): solidos.append(('c', x, y, r))
def sol_r(x0, y0, x1, y1): solidos.append(('r', x0, y0, x1, y1))
def ocupa(x, y, r): ocupados.append((x, y, r))
def libre(x, y, r, cam=0, rio=0, margen=60, campo=True):
    if x < margen or y < margen or x > X_FRONTERA - margen or y > H - margen: return False
    if y < MURO_NORTE + 20 or (x < 230 and y < 1580): return False
    if 1880 < y < 1975: return False    # la vía del tranvía
    if cam and d_camino_a(x, y, cam + 10) < cam: return False
    if rio and d_rio_a(x, y, rio + 10) < rio: return False
    if campo:
        for (x0, y0, x1, y1) in rects_campo:
            if x0 - r < x < x1 + r and y0 - r < y < y1 + r: return False
    for (ox, oy, orr) in ocupados:
        if (ox - x) ** 2 + (oy - y) ** 2 < (orr + r) ** 2: return False
    return True
def usar(sim, x, y, extra=''):
    return '<use href="#n5-d-%s" x="%s" y="%s"%s/>' % (sim, r1(x), r1(y), extra)
def item(sim, x, y, ordeny=None, extra=''):
    items.append(((y if ordeny is None else ordeny), usar(sim, x, y, extra)))
def escala(sim, x, y, s, ordeny=None):
    items.append(((y if ordeny is None else ordeny), '<g transform="translate(%s %s) scale(%.2f)"><use href="#n5-d-%s"/></g>' % (r1(x), r1(y), s, sim)))

def sombra(rx, ry=6, dy=2): return '<ellipse cx="2" cy="%d" rx="%d" ry="%d" fill="#0c1f5c" opacity=".14"/>' % (dy, rx, ry)
def copa(c1, c2, c3, r=20): return '<circle cx="0" cy="-30" r="%d" fill="%s"/><circle cx="-11" cy="-22" r="12" fill="%s" opacity=".85"/><circle cx="12" cy="-25" r="13" fill="%s"/><path d="M-4 -50a%d %d 0 0 1 22 15a%d %d 0 0 1 -31 5Z" fill="#2b6f62" opacity=".22"/>' % (r, c1, c2, c3, r, r, r, r)
TRONCO = '<rect x="-3" y="-15" width="6" height="17" rx="1.5" fill="#8a5528"/><rect x="-3" y="-15" width="2.4" height="17" fill="#6b3f1c" opacity=".6"/>'
SIM = {}
SIM['roble'] = sombra(19) + TRONCO + copa('#5aa88a', '#5fc4b0', '#4f9a7d')
SIM['roble2'] = sombra(19) + TRONCO + copa('#7bb369', '#8cc17a', '#6aa458')
SIM['roble3'] = sombra(19) + TRONCO + copa('#e0b04a', '#ecc56a', '#d29a34')
SIM['manzano'] = sombra(17) + TRONCO + copa('#5aa88a', '#6fb36f', '#4f9a7d', 17) + '<circle cx="-8" cy="-26" r="3" fill="#ef7a63"/><circle cx="7" cy="-35" r="3" fill="#ef7a63"/><circle cx="10" cy="-22" r="3" fill="#ef7a63"/><circle cx="-3" cy="-40" r="2.6" fill="#ef7a63"/>'
SIM['alamo'] = sombra(12) + '<rect x="-2.5" y="-14" width="5" height="16" fill="#8a5528"/><ellipse cx="0" cy="-48" rx="11" ry="40" fill="#6fb36f"/><path d="M0 -88C10 -66 10 -30 0 -10C6 -34 6 -66 0 -88Z" fill="#2b6f62" opacity=".3"/><ellipse cx="-3" cy="-60" rx="3" ry="14" fill="#8cc17a" opacity=".7"/>'
SIM['arbusto'] = sombra(14, 4, 1) + '<circle cx="-6" cy="-7" r="9" fill="#5aa88a"/><circle cx="6" cy="-8" r="10" fill="#6fb36f"/><circle cx="0" cy="-13" r="8" fill="#5fc4b0"/>'
SIM['seto'] = '<rect x="-23" y="-12" width="46" height="14" rx="7" fill="#4f9a7d"/><circle cx="-13" cy="-15" r="8" fill="#5aa88a"/><circle cx="5" cy="-16" r="9" fill="#5aa88a"/><circle cx="18" cy="-13" r="7" fill="#6fb36f"/><circle cx="-2" cy="-5" r="5" fill="#2b6f62" opacity=".25"/>'
SIM['amapola'] = '<path d="M0 0V-8M-6 0V-4" stroke="#2b6f62" stroke-width="1.6"/><circle cy="-10" r="4.2" fill="#ef7a63"/><circle cy="-10" r="1.4" fill="#0c1f5c"/><circle cx="-6" cy="-5" r="3.2" fill="#ef7a63"/><circle cx="-6" cy="-5" r="1" fill="#0c1f5c"/>'
SIM['aciano'] = '<path d="M0 0V-8M5 0V-4" stroke="#2b6f62" stroke-width="1.6"/><circle cy="-10" r="3.8" fill="#5b8ff0"/><circle cy="-10" r="1.3" fill="#0c1f5c"/><circle cx="5" cy="-5" r="3" fill="#5b8ff0"/>'
SIM['margarita'] = '<path d="M0 0V-7" stroke="#2b6f62" stroke-width="1.5"/><circle cy="-10" r="4.6" fill="#fff4d6"/><circle cy="-10" r="2" fill="#facc15"/>'
SIM['rosa'] = '<path d="M0 0V-7" stroke="#2b6f62" stroke-width="1.5"/><circle cy="-10" r="4" fill="#f4a3b5"/><circle cy="-10" r="1.6" fill="#e0a800"/>'
SIM['hierba'] = '<path d="M-5 0Q-6 -8 -9 -11M-1 0Q-1 -10 0 -14M4 0Q5 -8 9 -10" stroke="#4f9a7d" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
SIM['piedra'] = '<ellipse cx="0" cy="-3" rx="7" ry="4.5" fill="#b9ab8a"/><ellipse cx="-2" cy="-4.6" rx="3" ry="1.6" fill="#d8cdb0"/>'
SIM['seta'] = '<rect x="-1.4" y="-5" width="2.8" height="5" fill="#fff4d6"/><path d="M-6 -5a6 5 0 0 1 12 0Z" fill="#ef7a63"/><circle cx="-2" cy="-7" r="1" fill="#fff4d6"/><circle cx="2" cy="-6" r="1" fill="#fff4d6"/>'
SIM['fardo'] = sombra(15, 4, 1) + '<circle cy="-13" r="13" fill="#e8c65a"/><circle cy="-13" r="9" fill="none" stroke="#d6ac3c" stroke-width="2"/><circle cy="-13" r="4.5" fill="none" stroke="#d6ac3c" stroke-width="2"/>'
SIM['pajar'] = sombra(21, 5) + '<path d="M-19 0Q-19 -24 0 -42Q19 -24 19 0Z" fill="#e8c65a"/><path d="M0 -42Q19 -24 19 0H0Z" fill="#d6ac3c" opacity=".6"/><path d="M-11 -10L11 -14M-13 -21L9 -25" stroke="#d6ac3c" stroke-width="1.6"/>'
SIM['vaca'] = sombra(24, 5) + '<rect x="-20" y="-24" width="40" height="19" rx="8" fill="#fff4d6"/><path d="M-10 -24a7 6 0 0 1 12 1L0 -12Q-8 -9 -10 -24Z M8 -24h8a4 8 0 0 1 4 9h-9Z" fill="#2b2b3a"/><rect x="-17" y="-6" width="4" height="8" rx="1.5" fill="#fff4d6"/><rect x="11" y="-6" width="4" height="8" rx="1.5" fill="#fff4d6"/><rect x="-27" y="-26" width="12" height="13" rx="5" fill="#fff4d6"/><path d="M-27 -22h4v6h-4Z" fill="#f4a3b5"/><path d="M-23 -27l-2 -5M-17 -27l2 -5" stroke="#e0a800" stroke-width="2" stroke-linecap="round"/><circle cx="-22" cy="-22" r="1.2" fill="#0c1f5c"/>'
SIM['oveja'] = sombra(15, 4, 1) + '<circle cx="-5" cy="-11" r="9" fill="#fff4d6"/><circle cx="5" cy="-12" r="9" fill="#fff4d6"/><circle cx="0" cy="-17" r="8" fill="#fff4d6"/><rect x="-9" y="-4" width="2.6" height="6" fill="#2b2b3a"/><rect x="6" y="-4" width="2.6" height="6" fill="#2b2b3a"/><ellipse cx="-14" cy="-13" rx="5" ry="5.5" fill="#2b2b3a"/>'
SIM['pato'] = '<ellipse cx="0" cy="-3" rx="8" ry="5" fill="#fff4d6"/><circle cx="7" cy="-9" r="4" fill="#5fc4b0"/><path d="M10 -9l5 1.4l-5 1.6Z" fill="#f5a04a"/><path d="M-6 -4q-5 -3 -8 -1" stroke="#fff4d6" stroke-width="3" stroke-linecap="round" fill="none"/>'
SIM['junco'] = '<path d="M-6 0Q-8 -12 -5 -22M0 0Q0 -14 2 -26M6 0Q8 -10 6 -18" stroke="#6fb36f" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="-6.6" y="-27" width="3.4" height="8" rx="1.6" fill="#8a5528"/><rect x="0.8" y="-31" width="3.4" height="8" rx="1.6" fill="#8a5528"/>'
SIM['nenufar'] = '<ellipse cx="0" cy="0" rx="10" ry="5" fill="#5aa88a"/><path d="M0 0L9 -2" stroke="#8ab870" stroke-width="1.6"/><circle cx="-2" cy="-2" r="2.6" fill="#f4a3b5"/>'
SIM['poste'] = '<rect x="-2" y="-17" width="4" height="19" fill="#8a5528"/><path d="M-1 -13H32M-1 -6H32" stroke="#b5763c" stroke-width="2.4"/>'
SIM['cartel'] = sombra(10, 3, 1) + '<rect x="-2.5" y="-46" width="5" height="48" fill="#8a5528"/><path d="M-1 -44h30l7 5.5l-7 5.5h-30Z" fill="#fff4d6" stroke="#8a5528" stroke-width="2"/><path d="M1 -28h-27l-7 5l7 5h27Z" fill="#facc15" stroke="#8a5528" stroke-width="2"/>'
SIM['hito'] = sombra(9, 3, 1) + '<path d="M-7 1V-14a7 7 0 0 1 14 0V1Z" fill="#d8cdb0"/><path d="M-7 -8H7" stroke="#5b8ff0" stroke-width="3"/><path d="M0 -14a7 7 0 0 1 7 7V1H0Z" fill="#b9ab8a" opacity=".5"/>'
SIM['espanta'] = sombra(12, 4, 1) + '<rect x="-1.6" y="-44" width="3.2" height="46" fill="#8a5528"/><rect x="-18" y="-34" width="36" height="3.2" rx="1.6" fill="#8a5528"/><path d="M-8 -34h16l-3 18h-10Z" fill="#ef7a63"/><path d="M-4 -26h3v3h-3Z" fill="#facc15"/><circle cy="-46" r="6" fill="#f7d7b9"/><path d="M-11 -48h22l-4 -9h-14Z" fill="#e0a800"/><path d="M-18 -33l-5 6M18 -33l5 6" stroke="#e0a800" stroke-width="2" stroke-linecap="round"/>'
SIM['casa1'] = sombra(38, 6) + '<rect x="14" y="-62" width="9" height="22" fill="#b9ab8a"/><rect x="-30" y="-36" width="60" height="36" fill="#fff4d6"/><rect x="12" y="-36" width="18" height="36" fill="#dbd0ac" opacity=".6"/><path d="M-40 -36L0 -66L40 -36Z" fill="#ef7a63"/><path d="M0 -66L40 -36H0Z" fill="#c4503f" opacity=".5"/><rect x="-7" y="-24" width="14" height="24" rx="2" fill="#1d4ed8"/><rect x="-26" y="-28" width="13" height="13" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/><rect x="14" y="-28" width="13" height="13" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/>'
SIM['casa2'] = sombra(36, 6) + '<rect x="-28" y="-34" width="56" height="34" fill="#f7d7b9"/><rect x="10" y="-34" width="18" height="34" fill="#dbb994" opacity=".55"/><path d="M-38 -34L0 -62L38 -34Z" fill="#1d4ed8"/><path d="M0 -62L38 -34H0Z" fill="#0c1f5c" opacity=".35"/><rect x="-6" y="-24" width="13" height="24" rx="2" fill="#ef7a63"/><rect x="-24" y="-27" width="12" height="12" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/><rect x="13" y="-27" width="12" height="12" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/><circle cx="-18" cy="-4" r="6" fill="#5aa88a"/>'
SIM['granja'] = sombra(52, 7) + '<rect x="-30" y="-74" width="9" height="24" fill="#b9ab8a"/><rect x="26" y="-70" width="9" height="22" fill="#b9ab8a"/><rect x="-46" y="-46" width="92" height="46" fill="#f3e2a9"/><rect x="22" y="-46" width="24" height="46" fill="#d9c58a" opacity=".6"/><path d="M-54 -46L-24 -78H24L54 -46Z" fill="#c4503f"/><path d="M0 -78H24L54 -46H0Z" fill="#8a3c2e" opacity=".4"/><path d="M-46 -30H46M-46 -14H46" stroke="#b5763c" stroke-width="2" opacity=".5"/><rect x="-10" y="-30" width="20" height="30" rx="2" fill="#8a5528"/><rect x="-38" y="-38" width="14" height="14" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/><rect x="24" y="-38" width="14" height="14" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/>'
SIM['granero'] = sombra(56, 7) + '<rect x="-48" y="-48" width="96" height="48" fill="#ef7a63"/><rect x="24" y="-48" width="24" height="48" fill="#c4503f" opacity=".5"/><path d="M-52 -48L-40 -72L-16 -84H16L40 -72L52 -48Z" fill="#8a5528"/><path d="M0 -84H16L40 -72L52 -48H0Z" fill="#6b3f1c" opacity=".5"/><rect x="-20" y="-40" width="40" height="40" fill="#fff4d6"/><path d="M-20 -40L20 0M20 -40L-20 0M0 -40V0M-20 -20H20" stroke="#ef7a63" stroke-width="3"/><rect x="-20" y="-40" width="40" height="40" fill="none" stroke="#fff4d6" stroke-width="3"/><circle cx="0" cy="-60" r="6" fill="#fff4d6"/>'
SIM['silo'] = sombra(20, 5) + '<rect x="-15" y="-84" width="30" height="86" fill="#b8c4dd"/><rect x="2" y="-84" width="13" height="86" fill="#8b9bd6" opacity=".5"/><path d="M-17 -84a17 17 0 0 1 34 0Z" fill="#8b9bd6"/><path d="M-15 -62H15M-15 -40H15M-15 -18H15" stroke="#fff4d6" stroke-width="2.6"/>'
SIM['iglesia'] = sombra(56, 7) + '<rect x="-46" y="-48" width="64" height="48" fill="#d8cdb0"/><path d="M-52 -48L-14 -70L24 -48Z" fill="#5a6fb0"/><rect x="18" y="-92" width="30" height="92" fill="#e2d8bd"/><rect x="34" y="-92" width="14" height="92" fill="#b9ab8a" opacity=".5"/><path d="M12 -92L33 -128L54 -92Z" fill="#5a6fb0"/><rect x="31.5" y="-142" width="3" height="16" fill="#facc15"/><rect x="27" y="-138" width="12" height="3" fill="#facc15"/><circle cx="33" cy="-76" r="7" fill="#fff4d6" stroke="#0c1f5c" stroke-width="2"/><path d="M33 -80V-76L36 -74" stroke="#0c1f5c" stroke-width="1.6" fill="none"/><path d="M-36 -10v-18a6 6 0 0 1 12 0v18Z M-18 -10v-18a6 6 0 0 1 12 0v18Z M-0 -10v-18a6 6 0 0 1 12 0v18Z" fill="#7f8bb5"/><path d="M26 0V-22a7 7 0 0 1 14 0V0Z" fill="#5a3a22"/>'
SIM['molino'] = sombra(34, 6) + '<path d="M-24 0L-15 -92H15L24 0Z" fill="#fff4d6"/><path d="M0 -92H15L24 0H0Z" fill="#dbd0ac" opacity=".7"/><path d="M-19 -92a19 12 0 0 1 38 0Z" fill="#8a5528"/><rect x="-7" y="-26" width="14" height="26" rx="2" fill="#1d4ed8"/><rect x="-5" y="-62" width="10" height="12" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="1.8"/>'
SIM['pozo'] = sombra(16, 4, 1) + '<path d="M-12 0V-12H12V0Z" fill="#b9ab8a"/><ellipse cx="0" cy="-12" rx="12" ry="4" fill="#5f93e8"/><rect x="-13" y="-34" width="3" height="24" fill="#8a5528"/><rect x="10" y="-34" width="3" height="24" fill="#8a5528"/><path d="M-17 -34L0 -46L17 -34Z" fill="#ef7a63"/>'
SIM['tractor'] = sombra(28, 6) + '<rect x="-22" y="-26" width="30" height="14" rx="4" fill="#facc15"/><rect x="2" y="-38" width="18" height="26" rx="3" fill="#1d4ed8"/><rect x="5" y="-34" width="12" height="9" rx="2" fill="#bfe3f5"/><circle cx="12" cy="-8" r="12" fill="#0c1f5c"/><circle cx="12" cy="-8" r="5" fill="#fff4d6"/><circle cx="-18" cy="-5" r="7" fill="#0c1f5c"/><circle cx="-18" cy="-5" r="3" fill="#fff4d6"/><rect x="-26" y="-36" width="3" height="12" fill="#0c1f5c"/>'
candados = ''.join('<g transform="translate(%d %d)"><path d="M-2.4 0v-2.6a2.4 2.4 0 0 1 4.8 0V0" fill="none" stroke="#6b3f1c" stroke-width="1.2"/><rect x="-3.2" y="0" width="6.4" height="5" rx="1.2" fill="%s"/></g>' % (x, y, c) for x, y, c in [(-44, -34, '#ef7a63'), (-24, -34, '#facc15'), (-4, -34, '#5b8ff0'), (18, -34, '#f4a3b5'), (38, -34, '#ef7a63'), (-34, 33, '#5b8ff0'), (-10, 33, '#ef7a63'), (14, 33, '#facc15'), (36, 33, '#f4a3b5')])
SIM['puente'] = '<rect x="-62" y="-36" width="124" height="72" rx="6" fill="#d9a867"/><path d="M-50 -36V36M-36 -36V36M-22 -36V36M-8 -36V36M6 -36V36M20 -36V36M34 -36V36M48 -36V36" stroke="#b5763c" stroke-width="2"/><rect x="-64" y="-40" width="128" height="9" rx="3" fill="#8a5528"/><rect x="-64" y="31" width="128" height="9" rx="3" fill="#8a5528"/><rect x="-66" y="-44" width="9" height="17" rx="2" fill="#b9ab8a"/><rect x="57" y="-44" width="9" height="17" rx="2" fill="#b9ab8a"/><rect x="-66" y="27" width="9" height="17" rx="2" fill="#b9ab8a"/><rect x="57" y="27" width="9" height="17" rx="2" fill="#b9ab8a"/>' + candados
SIM.update(SIM2)
CUERPO = {'casa1': (70, 66), 'casa2': (66, 62), 'granja': (100, 80), 'granero': (104, 84), 'silo': (36, 86), 'iglesia': (104, 142), 'molino': (52, 94), 'pozo': (30, 34), 'tractor': (54, 38)}

def poner_cuerpo(sim, x, y, extra=''):
    w, h = CUERPO[sim]
    sol_r(x - w / 2, y - h, x + w / 2, y + 6)
    ocupa(x, y - h / 2, max(w, h) / 2 + 14)
    item(sim, x, y, extra=extra)

# ------------------------------------------------------------------ barreras fijas: bordes, montañas del norte y del oeste, frontera
sol_r(-60, -60, W + 60, MURO_NORTE)                  # las montañas del norte
sol_r(-60, MURO_NORTE, 200, 1560)                    # y las del oeste
sol_r(-60, H - 26, W + 60, H + 60)
sol_r(-60, -60, 26, H + 60)
sol_r(W - 26, -60, W + 60, H + 60)
sol_r(X_FRONTERA - 10, -60, X_FRONTERA + 10, H + 60)   # la frontera: solo se cruza al final, por la garita
# el desvío cerrado: la barrera y todo el jardín de detrás (no disponible)
sol_r(BX - 54, BY - 8, BX + 54, BY + 8)
sol_r(BX - 116, BY - 260, BX + 116, BY - 6)
for k in range(len(spur_densos)): ocupa(spur_densos[k][0], spur_densos[k][1], 54)
ocupa(BX, BY - 120, 150)

# ------------------------------------------------------------------ las paradas (edificios fijos)
paradas_geo = []
for i, (sx, sy) in enumerate(spots):
    bx, by = sx, sy - 64
    paradas_geo.append((sx, sy, bx, by))
    sol_r(bx - 54, by - 104, bx + 54, by + 6)
    ocupa(bx, by - 40, 98)
    ocupa(sx, sy, 62)
    futuro = i >= FUTURO_DESDE
    clases = 'n5-edif bloq' + (' futuro' if futuro else '')
    alto = 118 * ESC
    items.append((by, '''<g class="%s" id="n5-edif-%d" data-px="%s" data-py="%s" transform="translate(%s %s)">
  <g class="n5-cuerpo"><use href="#n5-ed-%d" x="-54" y="-106.2" width="108" height="109.8"/></g>
  %s
  <g class="n5-cand" transform="translate(48 -%.0f)"><circle r="14" fill="#fff4d6" stroke="#0c1f5c" stroke-width="3"/><path d="M-4.4 -2V-5.4a4.4 4.4 0 0 1 8.8 0V-2" fill="none" stroke="#0c1f5c" stroke-width="2.8" stroke-linecap="round"/><rect x="-6.6" y="-2" width="13.2" height="10" rx="2.4" fill="#0c1f5c"/></g>
  <g class="n5-etiq" transform="translate(0 -%.0f)"><rect id="n5-etiq-fondo-%d" x="-40" y="-13" width="80" height="26" rx="13" fill="#fff" stroke="#0c1f5c" stroke-width="3"/><text id="n5-etiq-texto-%d" x="0" y="5.5" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="15" fill="#0c1f5c"></text></g>
</g>''' % (clases, i, r1(sx), r1(sy), r1(bx), r1(by), i,
           '<ellipse class="n5-niebla" cx="0" cy="-34" rx="66" ry="46" fill="#fff" opacity=".42"/>' if futuro else '',
           alto - 6, alto + 16, i, i)))
simbolos_paradas = ''.join('<symbol id="n5-ed-%d" viewBox="-60 -118 120 122" overflow="visible">%s</symbol>\n' % (i, f()) for i, f in enumerate(PARADAS_ED))

# ------------------------------------------------------------------ estanque (se reserva antes que las granjas)
estanque = (980, 1330, 120, 66)
ocupa(estanque[0], estanque[1], 150)

# ------------------------------------------------------------------ campos
campos = []   # (cx, cy, w, h, ang, tipo)
def cabe_campo(cx, cy, w, h):
    for dx, dy in ((-w / 2, -h / 2), (w / 2, -h / 2), (-w / 2, h / 2), (w / 2, h / 2), (0, 0), (0, -h / 2), (0, h / 2), (-w / 2, 0), (w / 2, 0)):
        if not libre(cx + dx, cy + dy, 4, cam=74, rio=60, margen=40): return False
    for (ox, oy, ow, oh, _, _) in campos:
        if abs(ox - cx) < (ow + w) / 2 + 20 and abs(oy - cy) < (oh + h) / 2 + 20: return False
    return True
TIPOS = ['trigo', 'girasol', 'pasto', 'pasto', 'arado', 'rastrojo', 'amapolas', 'aciano', 'pasto', 'trigo', 'girasol', 'amapolas', 'trigo', 'pasto', 'aciano', 'rastrojo', 'pasto']
for tipo in TIPOS * 4:
    for _ in range(900):
        w, h = random.randint(200, 400), random.randint(130, 230)
        cx, cy = random.randint(260, 3150), random.randint(MURO_NORTE + 60, 1900)
        if cabe_campo(cx, cy, w, h):
            campos.append((cx, cy, w, h, random.uniform(-4, 4), tipo)); rects_campo.append((cx - w / 2 - 14, cy - h / 2 - 14, cx + w / 2 + 14, cy + h / 2 + 14)); break
corazon = None
for _ in range(2000):
    cx, cy = random.randint(300, 3000), random.randint(MURO_NORTE + 200, 1800)
    if cabe_campo(cx, cy, 330, 300):
        campos.append((cx, cy, 330, 300, 0, 'corazon')); rects_campo.append((cx - 180, cy - 164, cx + 180, cy + 164)); corazon = (cx, cy); break
campo_svg = ''
fondos = {'trigo': ('#e8c65a', '#d6ac3c'), 'girasol': ('#d9d77a', '#c4c262'), 'pasto': ('#b4d98f', '#a3cc7c'), 'arado': ('#b98e5f', '#a07a4e'), 'rastrojo': ('#dcc77a', '#c9b262'), 'amapolas': ('#bddd98', '#a9cf80'), 'aciano': ('#c2e09f', '#addb88'), 'corazon': ('#bddd98', '#a9cf80')}
for (cx, cy, w, h, ang, tipo) in campos:
    f1, f2 = fondos[tipo]
    g = '<g transform="translate(%s %s) rotate(%.1f)"><rect x="%s" y="%s" width="%d" height="%d" rx="10" fill="%s"/>' % (r1(cx), r1(cy), ang, r1(-w / 2), r1(-h / 2), w, h, f1)
    paso = 18 if tipo in ('trigo', 'arado', 'rastrojo', 'girasol') else 30
    g += '<path d="' + ''.join('M%s %sH%s' % (r1(-w / 2 + 8), r1(-h / 2 + k), r1(w / 2 - 8)) for k in range(paso // 2, h - 4, paso)) + '" stroke="%s" stroke-width="%s" opacity=".75"/>' % (f2, 4 if tipo in ('trigo', 'arado', 'rastrojo', 'girasol') else 2)
    g += '</g>'
    campo_svg += g
    ar = math.radians(ang)
    def en(lx, ly): return cx + lx * math.cos(ar) - ly * math.sin(ar), cy + lx * math.sin(ar) + ly * math.cos(ar)
    if tipo == 'corazon':
        for (px, py) in corazon_puntos(cx, cy + 6, 120, 15):
            items.append((py - 900, usar('amapola', px + random.uniform(-2, 2), py + random.uniform(-2, 2))))
        continue
    if tipo in ('amapolas', 'aciano'):
        for _ in range(int(w * h / 1800)):
            x, y = en(random.uniform(-w / 2 + 10, w / 2 - 10), random.uniform(-h / 2 + 14, h / 2 - 6))
            items.append((y - 900, usar('amapola' if tipo == 'amapolas' else 'aciano', x, y)))
    if tipo == 'girasol':
        for fy in range(34, h - 14, 38):
            for fx in range(24, w - 14, 34):
                x, y = en(-w / 2 + fx, -h / 2 + fy)
                items.append((y - 450, usar('girasol', x + random.uniform(-3, 3), y + random.uniform(-3, 3))))
    if tipo == 'trigo' and random.random() < .7:
        x, y = en(random.uniform(-w / 4, w / 4), random.uniform(-h / 5, h / 5))
        sol_c(x, y - 8, 9); ocupa(x, y, 30); item('espanta', x, y)
        for _ in range(3):
            x, y = en(random.uniform(-w / 2 + 30, w / 2 - 30), random.uniform(-h / 2 + 30, h / 2 - 20))
            if libre(x, y, 24, campo=False): sol_c(x, y - 12, 14); ocupa(x, y, 28); item('fardo', x, y)
    if tipo == 'pasto':
        for _ in range(random.randint(2, 4)):
            x, y = en(random.uniform(-w / 2 + 40, w / 2 - 40), random.uniform(-h / 2 + 40, h / 2 - 30))
            if libre(x, y, 30, campo=False):
                animal = random.choice(['vaca', 'oveja', 'oveja', 'caballo'])
                if animal in ('vaca', 'caballo'): sol_r(x - 24, y - 26, x + 24, y + 2)
                else: sol_c(x, y - 10, 14)
                ocupa(x, y, 36); item(animal, x, y)
        for lado in range(int(w // 34)):
            for yy in (-h / 2, h / 2):
                x, y = en(-w / 2 + 6 + lado * 34, yy); items.append((y, usar('poste', x, y)))
        for lado in range(int(h // 34)):
            for xx in (-w / 2, w / 2):
                x, y = en(xx, -h / 2 + 6 + lado * 34); items.append((y, usar('poste', x, y)))
    elif tipo in ('trigo', 'arado', 'rastrojo', 'amapolas', 'aciano', 'girasol'):
        for lado, (a, b) in enumerate([((-w / 2, -h / 2), (w / 2, -h / 2)), ((-w / 2, h / 2), (w / 2, h / 2)), ((-w / 2, -h / 2), (-w / 2, h / 2)), ((w / 2, -h / 2), (w / 2, h / 2))]):
            if random.random() < .55: continue
            largo = math.hypot(b[0] - a[0], b[1] - a[1]); n = int(largo // 46)
            for k in range(n):
                if random.random() < .12: continue
                t = (k + .5) / n; x, y = en(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                if libre(x, y, 6, cam=60, rio=50, campo=False):
                    sol_r(x - 22, y - 14, x + 22, y + 2); ocupa(x, y - 6, 16); item('seto', x, y)


# ------------------------------------------------------------------ pueblo, granjas y molinos
def poner_poblado(lista):
    for sim, x0, y0 in lista:
        for _ in range(500):
            x, y = x0 + random.uniform(-280, 280), y0 + random.uniform(-130, 130)
            if libre(x, y - 30, 60, cam=90, rio=90): poner_cuerpo(sim, x, y); break
poner_poblado([('iglesia', 2300, 860), ('casa1', 2060, 850), ('casa2', 2180, 790), ('casa1', 2440, 800), ('casa2', 2560, 860), ('casa1', 1950, 800), ('casa2', 2680, 800), ('casa1', 2330, 760)])
granjas = [(400, 1310), (1300, 1390), (2000, 1330), (2700, 1330), (1000, 840), (3000, 880), (700, 1480)]
chimeneas = []
for (gx0, gy0) in granjas:
    sitio = None
    for _ in range(1500):
        gx, gy = gx0 + random.uniform(-420, 420), gy0 + random.uniform(-220, 220)
        if libre(gx, gy - 30, 120, cam=110, rio=110): sitio = (gx, gy); break
    if not sitio: continue
    gx, gy = sitio
    poner_cuerpo('granja', gx, gy); chimeneas.append((gx - 25, gy - 74)); chimeneas.append((gx + 31, gy - 70))
    if libre(gx + 120, gy + 10, 70, cam=100, rio=100): poner_cuerpo('granero', gx + 120, gy + 10)
    if libre(gx + 192, gy + 4, 40, cam=100, rio=100): poner_cuerpo('silo', gx + 192, gy + 4)
    if libre(gx - 80, gy + 56, 30, cam=80, rio=80): poner_cuerpo('pozo', gx - 80, gy + 56)
    if libre(gx + 40, gy + 70, 40, cam=80, rio=80): poner_cuerpo('tractor', gx + 40, gy + 70)
    for k in range(3):
        px, py = gx - 100 + k * 90 + random.uniform(-10, 10), gy + 110 + random.uniform(-8, 8)
        if libre(px, py, 20, cam=80, rio=80): sol_c(px, py - 10, 14); ocupa(px, py, 24); item('pajar' if k == 1 else 'fardo', px, py)
    for k in range(4):
        px, py = gx + random.uniform(-90, 140), gy + 40 + random.uniform(0, 50)
        if libre(px, py - 6, 12, cam=70, rio=70): ocupa(px, py, 16); item('gallina', px, py)
molinos = []
for zona in [(1050, 1400, 840, 980), (2150, 2800, 1250, 1450), (260, 800, 1180, 1400)]:
    for _ in range(800):
        mx, my = random.uniform(zona[0], zona[1]), random.uniform(zona[2], zona[3])
        if libre(mx, my - 50, 70, cam=100, rio=110):
            poner_cuerpo('molino', mx, my); molinos.append((mx, my - 86)); break

# ------------------------------------------------------------------ montañas, lago y colinas
def poner_montana(sim, x, y, s):
    escala(sim, x, y, s)
    ocupa(x, y - 70 * s, 150 * s)
lago = (1480, 408, 150, 34)
for x in range(60, X_FRONTERA + 160, 300):          # fila de atrás, más baja y más clara
    if 1330 < x < 1640: continue
    poner_montana(random.choice(['montana', 'montana2']), x + random.uniform(-40, 40), 330 + random.uniform(-20, 20), random.uniform(1.0, 1.35))
poner_montana('montana', 1480, 300, 1.5)             # la gran montaña tras el lago
for x in range(120, X_FRONTERA + 120, 320):          # fila de delante
    if 1300 < x < 1660: continue
    poner_montana(random.choice(['montana2', 'montana3', 'montana3']), x + random.uniform(-40, 40), 432 + random.uniform(-6, 10), random.uniform(0.8, 1.15))
for y in range(760, 1560, 230):                      # el muro del oeste
    poner_montana(random.choice(['montana2', 'montana3']), 96 + random.uniform(-14, 20), y, random.uniform(0.7, 0.95))
for k in range(16):                                  # rocas al pie de las montañas y en el lago
    x, y = random.uniform(60, X_FRONTERA - 60), random.uniform(MURO_NORTE + 10, MURO_NORTE + 40)
    if not (1330 < x < 1630): item(random.choice(['roca', 'roca2']), x, y)
for k in range(10):
    x, y = lago[0] + random.uniform(-lago[2], lago[2]), lago[1] + random.uniform(-4, lago[3] + 20)
    item('roca2', x, y)
for k in range(24):                                  # neblina baja entre las montañas
    x, y = random.uniform(0, X_FRONTERA), random.uniform(330, 440)
    items.append((y - 1, '<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#fff" opacity=".22"/>' % (x, y, random.randint(90, 200), random.randint(12, 26))))

# colinas suaves (relieve que no bloquea)
colinas_svg = ''
n_colinas = 0
for _ in range(4000):
    if n_colinas >= 46: break
    x, y = random.randint(260, X_FRONTERA - 120), random.randint(MURO_NORTE + 70, 1900)
    rx, ry = random.randint(110, 260), random.randint(40, 92)
    if not libre(x, y, 10, cam=ry + 36, rio=ry + 40, margen=20): continue
    if any(abs(x - cx) < rx + w / 2 and abs(y - cy) < ry + h / 2 + 10 for (cx, cy, w, h, _, _) in campos): continue
    if any((x - bx) ** 2 + (y - by) ** 2 < (rx + 40) ** 2 for (_, _, bx, by) in paradas_geo): continue
    colinas_svg += colina(x, y, rx, ry)
    ocupa(x, y, ry)
    n_colinas += 1

# ------------------------------------------------------------------ árboles
arboles = []
def hay_arbol(x, y, sep):
    return any((ax - x) ** 2 + (ay - y) ** 2 < sep * sep for ax, ay in arboles)
def poner_arbol(tipo, x, y):
    arboles.append((x, y))
    if tipo == 'alamo': sol_c(x, y, 8); sol_c(x, y - 26, 10); sol_c(x, y - 54, 11)
    elif tipo == 'manzano': sol_c(x, y, 8); sol_c(x, y - 26, 13)
    else: sol_c(x, y, 9); sol_c(x, y - 30, 16)
    ocupa(x, y - 14, 30); item(tipo, x, y)
for i in range(0, len(densos), 7):
    x, y = densos[i]
    if random.random() < .5: continue
    lado = 1 if random.random() < .65 else -1
    tx, ty = densos[min(len(densos) - 1, i + 2)][0] - densos[max(0, i - 2)][0], densos[min(len(densos) - 1, i + 2)][1] - densos[max(0, i - 2)][1]
    l = math.hypot(tx, ty) or 1
    px, py = x - ty / l * 74 * lado, y + tx / l * 74 * lado
    if libre(px, py - 40, 26, cam=62, rio=70) and not hay_arbol(px, py, 70): poner_arbol('alamo', px, py)
for fx in range(5):
    for fy in range(3):
        x, y = 300 + fx * 86, 1390 + fy * 86
        if libre(x, y - 20, 28, cam=80, rio=70) and not hay_arbol(x, y, 60): poner_arbol('manzano', x, y)
bosques = [(600, 840, 220, 110), (1900, 860, 240, 90), (2800, 830, 170, 130), (3060, 1080, 110, 110), (700, 1310, 160, 90), (1900, 1270, 220, 80), (2900, 1390, 160, 120), (700, 1800, 380, 60), (1900, 1800, 480, 60), (2800, 1800, 280, 60), (330, 900, 80, 240), (330, 1720, 110, 100), (1100, 880, 120, 70), (2250, 1290, 120, 70), (1250, 1230, 110, 60)]
for (cx, cy, rx, ry) in bosques:
    for _ in range(int(rx * ry / 1500)):
        for _ in range(8):
            x, y = cx + random.uniform(-rx, rx), cy + random.uniform(-ry, ry)
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1: continue
            if libre(x, y - 24, 30, cam=64, rio=70) and not hay_arbol(x, y, 76):
                poner_arbol(random.choice(['roble', 'roble', 'roble2', 'roble2', 'roble3', 'manzano']), x, y); break
for _ in range(4000):
    x, y = random.uniform(80, 3250), random.uniform(MURO_NORTE + 30, 1900)
    if len(arboles) > 700: break
    if libre(x, y - 24, 28, cam=60, rio=64) and not hay_arbol(x, y, 80):
        for (cx, cy, w, h, _, _) in campos:
            if abs(x - cx) < w / 2 + 10 and abs(y - cy) < h / 2 + 10: break
        else:
            poner_arbol(random.choice(['roble', 'roble2', 'roble3', 'manzano']), x, y)
for _ in range(1500):
    x, y = random.uniform(60, 3280), random.uniform(MURO_NORTE + 20, 1940)
    if libre(x, y - 8, 14, cam=52, rio=56) and not hay_arbol(x, y, 30):
        if random.random() < .35:
            sol_c(x, y - 7, 11); ocupa(x, y, 16); item('arbusto', x, y)
n_ciervos = 0
for k in range(30):                                   # ciervos que se asoman al borde de los bosques
    if n_ciervos >= 7: break
    for _ in range(300):
        x, y = random.uniform(300, 3200), random.uniform(MURO_NORTE + 40, 1800)
        if libre(x, y - 10, 26, cam=90, rio=80) and any((x - ax) ** 2 + (y - ay) ** 2 < 130 ** 2 for ax, ay in arboles):
            sol_r(x - 18, y - 26, x + 18, y + 2); ocupa(x, y, 34); item('ciervo', x, y); n_ciervos += 1; break

# ------------------------------------------------------------------ puentes, estanque, juncos y cisnes
puentes_svg = ''.join('<use href="#n5-d-puente" transform="translate(%s %s) rotate(%.1f)"/>' % (r1(x), r1(y), ang) for x, y, ang in puentes_geo)
for (x, y, ang) in puentes_geo:
    for k in (-1, 1): items.append((y + 80, usar('junco', x + k * 20, y + k * 44)))
for _ in range(80):
    i = random.randrange(len(rio_densos)); x, y = rio_densos[i]
    ox = random.choice([-1, 1]) * random.uniform(40, 48)
    if d_camino_a(x + ox, y, 90) > 66: items.append((y, usar('junco', x + ox, y + random.uniform(-4, 4))))
ex, ey, erx, ery = estanque
items_pond = ''
for k in range(7): items_pond += usar('nenufar', ex + random.uniform(-erx * .7, erx * .7), ey + random.uniform(-ery * .6, ery * .6))
items_pond += usar('cisnes', ex - 24, ey + 10)
for k in range(9):
    a = random.uniform(0, 2 * math.pi); items.append((ey + ery, usar('junco', ex + math.cos(a) * (erx + 10), ey + math.sin(a) * (ery + 6))))

# ------------------------------------------------------------------ detalles pequeños y detalles nuestros
for i in [len(densos) * k // 7 for k in (1, 3, 5)]:
    x, y = densos[i]; px, py = x + 36, y - 52
    if libre(px, py - 20, 14, cam=44, rio=60): sol_c(px, py - 10, 8); ocupa(px, py, 20); item('cartel', px, py)
for i in range(60, len(densos), 58):
    x, y = densos[i]; px, py = x - 34, y + 50
    if libre(px, py - 8, 10, cam=40, rio=50): sol_c(px, py - 8, 7); ocupa(px, py, 14); item('hito', px, py)
def sitio_libre(x0, y0, r, cam, rio=60, intentos=300, ancho=240):
    for _ in range(intentos):
        x, y = x0 + random.uniform(-ancho, ancho), y0 + random.uniform(-ancho * .6, ancho * .6)
        if libre(x, y - 10, r, cam=cam, rio=rio): return x, y
    return None
def cartel_nombre(p, texto, hacia):
    sx = -1 if hacia < 0 else 1
    sol_c(p[0], p[1] - 8, 8); ocupa(p[0], p[1], 40)
    items.append((p[1], '<g transform="translate(%s %s)"><ellipse cx="2" cy="1" rx="12" ry="3" fill="#0c1f5c" opacity=".14"/><rect x="-2.5" y="-58" width="5" height="60" fill="#8a5528"/><g transform="scale(%d 1)"><path d="M-1 -56h72l9 9l-9 9h-72Z" fill="#fff4d6" stroke="#8a5528" stroke-width="2.4" stroke-linejoin="round"/></g><text x="%d" y="-41" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="13" fill="#0c1f5c">%s</text></g>' % (r1(p[0]), r1(p[1]), sx, sx * 34, texto)))
p = sitio_libre(330, 1580, 24, 70)
if p: cartel_nombre(p, 'Valencia', -1)
p = sitio_libre(3200, 700, 24, 70, ancho=90)
if p: cartel_nombre(p, 'Bruxelles', 1)
tocones = []
for k in range(2):                                    # el tocadiscos en un tocón
    p = sitio_libre(random.choice([700, 2500, 1900, 3000]), random.choice([900, 1300, 860]), 30, 60, ancho=500, intentos=900)
    if p: sol_c(p[0], p[1] - 10, 14); ocupa(p[0], p[1], 40); item('tocon-disco', p[0], p[1]); tocones.append(p)
for k in range(3):                                    # la manta de pícnic con matcha, pan y el espejito
    p = sitio_libre(random.choice([1300, 1700, 2600, 600]), random.choice([1000, 1400, 800]), 36, 60, rio=70, ancho=500, intentos=900)
    if p: ocupa(p[0], p[1], 46); item('manta', p[0], p[1])
for k in range(2):                                    # una bola de billar olvidada
    p = sitio_libre(random.choice([1000, 2200]), random.choice([760, 1500]), 20, 80, ancho=400)
    if p: ocupa(p[0], p[1], 24); item('bola8', p[0], p[1])
n_azul = 0
for _ in range(900):                                  # la florecita azul de limpiapipas
    if n_azul >= 12: break
    x, y = random.uniform(300, 3250), random.uniform(MURO_NORTE + 30, 1900)
    if libre(x, y, 10, cam=50, rio=50): ocupa(x, y, 60); item('flor-azul', x, y); n_azul += 1
colores = ['#facc15', '#ef7a63', '#1d4ed8', '#f4a3b5', '#a99be8', '#f5a04a', '#5b8ff0', '#5fc4b0', 'bi']
p = sitio_libre(420, 1790, 30, 60, ancho=60)           # las nueve amapolas, en un arco
if p:
    for k, c in enumerate(colores):
        ang = math.pi + math.pi * k / 8; px, py = p[0] + math.cos(ang) * 96, p[1] + 30 + math.sin(ang) * 22
        flor = ('<circle cy="-14" r="6" fill="#facc15"/><path d="M-6 -14a6 6 0 0 1 12 0Z" fill="#1d4ed8"/>' if c == 'bi' else '<circle cy="-14" r="6.4" fill="%s"/><circle cy="-14" r="2.2" fill="#0c1f5c"/>' % c)
        items.append((py, '<g transform="translate(%s %s)"><path d="M0 0V-10" stroke="#2b6f62" stroke-width="2"/>%s</g>' % (r1(px), r1(py), flor)))
    ocupa(p[0], p[1], 120)
items.append((900, '<g transform="translate(%d 900) scale(1.25)" opacity=".75"><use href="#n5-d-atomium"/></g>' % (X_FRONTERA + 150)))
items.append((1500, '<g transform="translate(%d 1500) scale(1.1)" opacity=".7"><use href="#n5-d-arco-lejano"/></g>' % (X_FRONTERA + 140)))
n_f = 0
for _ in range(14000):
    if n_f > 1500: break
    x, y = random.uniform(60, 3280), random.uniform(MURO_NORTE + 20, 1940)
    if not libre(x, y, 3, cam=44, rio=46): continue
    sim = random.choice(['amapola', 'aciano', 'margarita', 'rosa', 'margarita', 'amapola', 'aciano', 'seta', 'piedra', 'hierba', 'hierba', 'hierba'])
    items.append((y - 400, usar(sim, x, y))); n_f += 1
bordes = ''
for i in range(0, len(densos), 2):
    if random.random() < .45:
        x, y = densos[i]; lado = random.choice([-1, 1])
        tx, ty = densos[min(len(densos) - 1, i + 1)][0] - densos[max(0, i - 1)][0], densos[min(len(densos) - 1, i + 1)][1] - densos[max(0, i - 1)][1]
        l = math.hypot(tx, ty) or 1
        d = random.uniform(32, 46)
        px, py = x - ty / l * d * lado, y + tx / l * d * lado
        if d_rio_a(px, py, 60) > 44 and py > MURO_NORTE + 10:
            bordes += usar(random.choice(['hierba', 'hierba', 'piedra', 'piedra', 'margarita', 'amapola']), px, py)

# ------------------------------------------------------------------ el desvío cerrado
def desvio_svg():
    s = '<ellipse cx="%s" cy="%s" rx="116" ry="100" fill="url(#n5-brillo)" opacity=".85"/>' % (r1(BX), r1(BY - 120))
    ax, ay = BX + 22, BY - 50
    s += '<path d="M%s %sV%sa38 38 0 0 1 76 0V%s" transform="translate(-38 0)" fill="none" stroke="#5aa88a" stroke-width="9" stroke-linecap="round"/>' % (r1(ax), r1(ay), r1(ay - 70), r1(ay))
    for k in range(13):
        a = math.pi * k / 12
        px, py = ax + math.cos(math.pi - a) * 38, ay - 70 - math.sin(a) * 38
        s += '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (r1(px), r1(py), 5 if k % 2 else 4, random.choice(['#f4a3b5', '#ef7a63', '#fff4d6']))
        if k % 3 == 0: s += '<circle cx="%s" cy="%s" r="2.6" fill="#facc15"/>' % (r1(px + 5), r1(py - 6))
    for lado in (-1, 1):
        s += '<rect x="%s" y="%s" width="9" height="70" fill="#6b3f1c"/><circle cx="%s" cy="%s" r="6" fill="#facc15"/>' % (r1(ax + lado * 38 - 4.5), r1(ay - 70), r1(ax + lado * 38), r1(ay - 76))
    s += '<path d="M%s %sl3 7l7 3l-7 3l-3 7l-3 -7l-7 -3l7 -3Z M%s %sl2 5l5 2l-5 2l-2 5l-2 -5l-5 -2l5 -2Z" fill="#facc15"/>' % (r1(BX - 20), r1(BY - 190), r1(BX + 44), r1(BY - 170))
    s += '<ellipse cx="%s" cy="%s" rx="110" ry="50" fill="#fff" opacity=".5"/>' % (r1(BX + 6), r1(BY - 110))
    s += '<rect x="%s" y="%s" width="10" height="44" rx="3" fill="#fff4d6" stroke="#06113a" stroke-width="2.4"/><rect x="%s" y="%s" width="10" height="44" rx="3" fill="#fff4d6" stroke="#06113a" stroke-width="2.4"/>' % (r1(BX - 62), r1(BY - 30), r1(BX + 52), r1(BY - 30))
    s += '<rect x="%s" y="%s" width="104" height="13" rx="3" fill="#fff4d6" stroke="#06113a" stroke-width="2.4"/>' % (r1(BX - 52), r1(BY - 10))
    s += '<path d="' + ''.join('M%s %sl9 0l-6 13l-9 0Z' % (r1(BX - 50 + k * 26), r1(BY - 10)) for k in range(4)) + '" fill="#ef7a63"/>'
    s += '<g transform="translate(%s %s)"><rect x="-2.4" y="0" width="4.8" height="50" fill="#8a5528"/><path d="M0 -40L26 -14L0 12L-26 -14Z" fill="#facc15" stroke="#0c1f5c" stroke-width="3.4" stroke-linejoin="round"/><path d="M0 -26l2.6 8l8 2.6l-8 2.6l-2.6 8l-2.6 -8l-8 -2.6l8 -2.6Z" fill="#0c1f5c"/></g>' % (r1(BX - 92), r1(BY + 8))
    s += '<g transform="translate(%s %s)"><ellipse cx="2" cy="1" rx="12" ry="3" fill="#0c1f5c" opacity=".14"/><rect x="-2.5" y="-54" width="5" height="56" fill="#8a5528"/><path d="M-1 -52h64l9 9l-9 9h-64Z" fill="#fff4d6" stroke="#8a5528" stroke-width="2.4" stroke-linejoin="round"/><text x="30" y="-37" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="13" fill="#0c1f5c">FRANȚA</text></g>' % (r1(BX + 74), r1(BY + 22))
    return s
items.append((BY + 30, desvio_svg()))
for k in range(8):                                     # setos que cierran el jardín por los lados
    for lado in (-1, 1):
        items.append((BY - 40 - k * 30, usar('seto', BX + lado * 124, BY - 20 - k * 30)))

# ------------------------------------------------------------------ colisiones: rejilla
def rejilla():
    celdas = bytearray(COLS * FILAS)
    def marca(i, j):
        if 0 <= i < COLS and 0 <= j < FILAS: celdas[j * COLS + i] = 1
    for s in solidos:
        if s[0] == 'r':
            _, x0, y0, x1, y1 = s
            for j in range(max(0, int(y0 // CELDA)), min(FILAS, int(y1 // CELDA) + 1)):
                for i in range(max(0, int(x0 // CELDA)), min(COLS, int(x1 // CELDA) + 1)): marca(i, j)
        else:
            _, x, y, r = s
            for j in range(int((y - r) // CELDA), int((y + r) // CELDA) + 1):
                for i in range(int((x - r) // CELDA), int((x + r) // CELDA) + 1):
                    if (i * CELDA + CELDA / 2 - x) ** 2 + (j * CELDA + CELDA / 2 - y) ** 2 <= (r + 4) ** 2: marca(i, j)
    ex_, ey_, erx_, ery_ = estanque
    for j in range(FILAS):
        for i in range(COLS):
            x, y = i * CELDA + CELDA / 2, j * CELDA + CELDA / 2
            if d_rio_a(x, y, ANCHO_RIO + 10) < ANCHO_RIO or (((x - ex_) / erx_) ** 2 + ((y - ey_) / ery_) ** 2 < 1):
                celdas[j * COLS + i] = 1
    for (bx, by, ang) in puentes_geo:
        c, s_ = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        for j in range(int((by - 100) // CELDA), int((by + 100) // CELDA) + 1):
            for i in range(int((bx - 100) // CELDA), int((bx + 100) // CELDA) + 1):
                x, y = i * CELDA + CELDA / 2 - bx, j * CELDA + CELDA / 2 - by
                u, v = x * c + y * s_, -x * s_ + y * c
                if abs(u) <= 64 and abs(v) <= 37 and 0 <= i < COLS and 0 <= j < FILAS: celdas[j * COLS + i] = 0
    return celdas
celdas = rejilla()
hexa = ''.join('%x' % ((celdas[k] << 3) | ((celdas[k + 1] if k + 1 < len(celdas) else 0) << 2) | ((celdas[k + 2] if k + 2 < len(celdas) else 0) << 1) | (celdas[k + 3] if k + 3 < len(celdas) else 0)) for k in range(0, len(celdas), 4))

def libre_coche(i, j):
    r = int(math.ceil(R_COCHE / CELDA))
    for dj in range(-r, r + 1):
        for di in range(-r, r + 1):
            ii, jj = i + di, j + dj
            if 0 <= ii < COLS and 0 <= jj < FILAS and celdas[jj * COLS + ii]:
                if ((max(abs(di) - 0.5, 0)) ** 2 + (max(abs(dj) - 0.5, 0)) ** 2) * CELDA * CELDA < R_COCHE * R_COCHE: return False
    return True
def alcanzable(origen, destinos):
    from collections import deque
    oi, oj = int(origen[0] // CELDA), int(origen[1] // CELDA)
    vis = {(oi, oj)}; q = deque([(oi, oj)])
    while q:
        i, j = q.popleft()
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            n = (i + di, j + dj)
            if n in vis or not (0 <= n[0] < COLS and 0 <= n[1] < FILAS) or not libre_coche(*n): continue
            vis.add(n); q.append(n)
    return [((int(d[0] // CELDA), int(d[1] // CELDA)) in vis) for d in destinos]
inicio = densos[next(i for i, p in enumerate(densos) if p[0] >= 120)]
mal = [(round(p[0]), round(p[1])) for p in densos if 30 < p[0] < X_FRONTERA - 100 and not libre_coche(int(p[0] // CELDA), int(p[1] // CELDA))]
print('puntos del camino de tierra no transitables:', len(mal), mal[:12])
ok = alcanzable(inicio, [(s[0], s[1]) for s in spots] + [PUERTA, DESVIO])
print('alcanzables desde el inicio (13 paradas, garita y desvío):', ok)
assert all(ok), 'hay paradas, la garita o el desvío sin camino libre'

# ------------------------------------------------------------------ SVG del mundo
parches = ''.join('<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="%s" opacity=".5"/>' % (random.randint(0, W), random.randint(MURO_NORTE, H), random.randint(150, 440), random.randint(70, 190), random.choice(['#b9d796', '#d7e7b0', '#c0dc9d', '#a9cf8a', '#dfe3a3', '#cfe9ac'])) for _ in range(90))
items.sort(key=lambda t: t[0])
def lista_defs():
    return ''.join('<g id="n5-d-%s">%s</g>' % (k, v) for k, v in SIM.items())
OFF = [0, 8, -6, 4, -8, 6, 0]
XB = tuple(X_FRONTERA + o for o in OFF)
frontera = '<path d="M%d -10C%d 500 %d 1000 %d 1500C%d 1720 %d 1860 %d 2010" fill="none" stroke="#fff4d6" stroke-width="7" opacity=".85"/><path d="M%d -10C%d 500 %d 1000 %d 1500C%d 1720 %d 1860 %d 2010" fill="none" stroke="#ef7a63" stroke-width="7" stroke-dasharray="28 28" opacity=".9"/>' % (XB + XB)
niebla = '<rect x="%d" y="-20" width="%d" height="%d" fill="url(#n5-niebla-lin)"/>' % (X_FRONTERA - 240, W - X_FRONTERA + 260, H + 40)
belgica = '<rect x="%d" y="-20" width="%d" height="%d" fill="#f3e2a9"/>' % (X_FRONTERA, W - X_FRONTERA + 40, H + 40)
postes_frontera = ''.join('<g transform="translate(%d %d)"><rect x="-4" y="-34" width="8" height="36" fill="#fff4d6"/><rect x="-4" y="-26" width="8" height="8" fill="#ef7a63"/><rect x="-4" y="-10" width="8" height="8" fill="#ef7a63"/></g>' % (X_FRONTERA + 3, y) for y in range(MURO_NORTE + 30, H, 130) if abs(y - puerta_y) > 110)
px_g, py_g = X_FRONTERA, puerta_y
garita = '''<g transform="translate(%d %d)">
  <rect x="-30" y="-70" width="60" height="70" fill="#fff4d6"/><rect x="18" y="-70" width="12" height="70" fill="#0c1f5c" opacity=".1"/>
  <path d="M-38 -70L-26 -92H26L38 -70Z" fill="#0c1f5c"/><path d="M-38 -70H38" stroke="#06113a" stroke-width="3"/>
  <rect x="-20" y="-58" width="36" height="26" rx="3" fill="#facc15"/><path d="M-2 -58V-32M-20 -45H16" stroke="#0c1f5c" stroke-width="3"/><rect x="-20" y="-58" width="36" height="26" rx="3" fill="none" stroke="#0c1f5c" stroke-width="3"/>
  <rect x="-30" y="-14" width="60" height="9" fill="#ef7a63"/><path d="M-30 -14L-20 -5H-30ZM-12 -14L-2 -5H8L-2 -14ZM14 -14L24 -5H30L30 -14Z" fill="#fff4d6"/>
</g>
<g transform="translate(%d %d)"><rect x="-2" y="-90" width="4" height="90" fill="#06113a"/><circle cy="-92" r="4" fill="#facc15"/><g class="n5-bandera"><rect x="2" y="-88" width="10" height="20" fill="#0c1f5c"/><rect x="12" y="-88" width="10" height="20" fill="#facc15"/><rect x="22" y="-88" width="10" height="20" fill="#ef7a63"/></g></g>
<g transform="translate(%d %d)"><rect x="-2" y="-90" width="4" height="90" fill="#06113a"/><circle cy="-92" r="4" fill="#facc15"/><g class="n5-bandera"><rect x="-32" y="-88" width="10" height="20" fill="#5b8ff0"/><rect x="-22" y="-88" width="10" height="20" fill="#fff4d6"/><rect x="-12" y="-88" width="10" height="20" fill="#ef7a63"/></g></g>
<g transform="translate(%d %d)"><rect x="-3" y="-44" width="6" height="44" fill="#06113a"/><rect x="-40" y="-84" width="80" height="44" rx="6" fill="#06113a" opacity=".25" transform="translate(3 4)"/><rect x="-40" y="-84" width="80" height="44" rx="6" fill="#1d4ed8" stroke="#fff4d6" stroke-width="3"/><text x="0" y="-62" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="13" fill="#fff4d6">BELGIQUE</text><text x="0" y="-45" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="13" fill="#fff4d6">BELGIË</text></g>''' % (px_g - 50, py_g - 44, px_g - 8, py_g - 44, px_g - 100, py_g - 44, px_g + 96, py_g - 44)
rotulos = '<g><rect x="50" y="1815" width="104" height="26" rx="13" fill="#fff" stroke="#0c1f5c" stroke-width="3"/><text x="102" y="1833" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="15" fill="#0c1f5c">FRANȚA</text></g><g><rect x="%d" y="%d" width="100" height="26" rx="13" fill="#fff" stroke="#0c1f5c" stroke-width="3"/><text x="%d" y="%d" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="15" fill="#0c1f5c">BELGIA</text></g>' % (X_FRONTERA + 70, py_g + 80, X_FRONTERA + 120, py_g + 98)
via_tranvia = '<rect x="-20" y="1926" width="%d" height="26" fill="#a99b78" opacity=".35"/><path d="M-20 1932H%d M-20 1946H%d" stroke="#6b6f85" stroke-width="3.4"/><path d="M-20 1939H%d" stroke="#8a5528" stroke-width="12" stroke-dasharray="4 20" opacity=".7"/>' % (W + 40, W + 20, W + 20, W + 20)
hojas_pasto = '<pattern id="n5-hierba-tile" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M6 14l2 -7M10 14l-1 -6M34 40l2 -7M38 40l-1 -6M52 18l2 -7M20 56l2 -7M58 50l-2 -6M44 8l1 -6" stroke="#8fc06b" stroke-width="1.6" stroke-linecap="round" opacity=".5"/><circle cx="26" cy="22" r="1.2" fill="#fff" opacity=".35"/><circle cx="48" cy="50" r="1.2" fill="#fff" opacity=".3"/></pattern>'
lago_svg = '<ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#8aa86a"/><ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#5f93e8"/><ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#86b3f2"/><path d="M%d %dq30 -6 60 0M%d %dq-26 -4 -50 2" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>' % (lago[0], lago[1], lago[2] + 14, lago[3] + 12, lago[0], lago[1], lago[2], lago[3], lago[0], lago[1], lago[2] - 16, lago[3] - 12, lago[0] - 60, lago[1] - 4, lago[0] + 40, lago[1] + 8)
sombra_montes = '<rect x="-20" y="-20" width="%d" height="%d" fill="url(#n5-sombra-montes)"/>' % (W + 40, MURO_NORTE + 160)

mundo = '''<svg class="n5-mundo" id="n5-mundo" viewBox="0 0 %d %d" width="%d" height="%d" aria-hidden="true" data-celda="%d" data-cols="%d" data-filas="%d" data-rejilla="%s">
  <defs>
    <linearGradient id="n5-niebla-lin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity=".8"/></linearGradient>
    <linearGradient id="n5-sombra-montes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1f5c" stop-opacity=".22"/><stop offset=".7" stop-color="#0c1f5c" stop-opacity=".06"/><stop offset="1" stop-color="#0c1f5c" stop-opacity="0"/></linearGradient>
    <linearGradient id="n5-g-colina" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dcecbe"/><stop offset="1" stop-color="#a8cf86"/></linearGradient>
    <radialGradient id="n5-brillo"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
    <pattern id="n5-cuadros" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fff4d6"/><rect width="6" height="6" fill="#5aa88a"/><rect x="6" y="6" width="6" height="6" fill="#5aa88a"/></pattern>
    %s
    %s
    %s
  </defs>
  <rect x="-20" y="-20" width="%d" height="%d" fill="#c5dfa2"/>
  <rect x="-20" y="-20" width="%d" height="%d" fill="url(#n5-hierba-tile)"/>
  %s
  %s
  %s
  %s
  <!-- Lago de montaña, río, estanque y puentes -->
  %s
  <path d="%s" fill="none" stroke="#8aa86a" stroke-width="92" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="n5-rio" d="%s" fill="none" stroke="#5f93e8" stroke-width="74" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="%s" fill="none" stroke="#86b3f2" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="%s" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-dasharray="3 26" stroke-linecap="round" transform="translate(-9 0)"/>
  <ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#8aa86a"/><ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#5f93e8"/><ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#86b3f2"/>%s
  <!-- La vía del tranvía, al sur -->
  %s
  <!-- Camino de tierra y el caminito del desvío -->
  <path d="%s" fill="none" stroke="#a07d4a" stroke-width="74" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="%s" fill="none" stroke="#c9a36b" stroke-width="62" stroke-linecap="round" stroke-linejoin="round"/>
  <path id="n5-camino" data-puntos="%s" d="%s" fill="none" stroke="#a07d4a" stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="%s" fill="none" stroke="#c9a36b" stroke-width="70" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="%s" fill="none" stroke="#d8b987" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
  <path d="%s" fill="none" stroke="#a9824f" stroke-width="5" stroke-dasharray="70 20" stroke-linecap="round" opacity=".75"/>
  <path d="%s" fill="none" stroke="#a9824f" stroke-width="5" stroke-dasharray="70 20" stroke-linecap="round" opacity=".75"/>
  %s
  %s
  %s
  <!-- Frontera con Bélgica -->
  %s
  %s
  %s
  %s
  %s
  <g id="n5-puerta" data-px="%s" data-py="%s" data-bx="%d"></g>
  <g id="n5-desvio" data-px="%s" data-py="%s" data-puntos="%s"></g>
</svg>''' % (W, H, W, H, CELDA, COLS, FILAS, hexa,
             hojas_pasto, simbolos_paradas, lista_defs(),
             W + 40, H + 40, W + 40, H + 40, belgica + parches, colinas_svg, campo_svg, sombra_montes,
             lago_svg,
             rio_d, rio_d, rio_d, rio_d,
             ex, ey, erx + 12, ery + 10, ex, ey, erx, ery, ex, ey, erx - 14, ery - 12, items_pond,
             via_tranvia,
             d_spur, d_spur,
             attr_puntos, d_camino, d_camino, d_camino, surco_a, surco_b,
             puentes_svg, bordes,
             ''.join(s for _, s in items),
             niebla, frontera, postes_frontera, garita, rotulos,
             r1(PUERTA[0]), r1(PUERTA[1]), X_FRONTERA,
             r1(DESVIO[0]), r1(DESVIO[1]), attr_spur)

# ------------------------------------------------------------------ capa viva (animaciones suaves) y capa del juego
def viva():
    s = ''
    for k, (mx, my) in enumerate(molinos):
        s += '<g transform="translate(%s %s)"><g class="n5-aspas" style="animation-duration:%ds"><path d="M0 0L-6 -62L6 -62Z M0 0L62 -6L62 6Z M0 0L6 62L-6 62Z M0 0L-62 6L-62 -6Z" fill="#fff4d6" stroke="#8a5528" stroke-width="3" stroke-linejoin="round"/></g><circle r="7" fill="#8a5528"/></g>' % (r1(mx), r1(my), 14 + 3 * k)
    for k, (hx, hy) in enumerate(chimeneas):
        for p in range(3):
            s += '<circle class="n5-humo" cx="%s" cy="%s" r="%d" style="animation-delay:%.1fs"/>' % (r1(hx + 4), r1(hy), 5 + p, p * 1.6 + k * .5)
    for k in range(12):
        y = random.randint(500, 1850); x0 = random.randint(0, 3300)
        s += '<g transform="translate(%d %d)"><g class="n5-pajaro" style="animation-duration:%ds;animation-delay:-%ds"><path d="M-9 0Q-4 -7 0 0Q4 -7 9 0" stroke="#2b2b3a" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></g>' % (x0, y, random.randint(46, 80), random.randint(0, 40))
    for k in range(18):
        x, y = random.randint(300, 3200), random.randint(MURO_NORTE + 60, 1900)
        c = random.choice(['#f5a04a', '#f4a3b5', '#fff4d6', '#a99be8'])
        s += '<g transform="translate(%d %d)"><g class="n5-mariposa" style="animation-duration:%.1fs;animation-delay:-%.1fs"><ellipse cx="-3.4" cy="0" rx="3.6" ry="2.6" fill="%s"/><ellipse cx="3.4" cy="0" rx="3.6" ry="2.6" fill="%s"/></g></g>' % (x, y, random.uniform(9, 16), random.uniform(0, 9), c, c)
    for k in range(2):
        s += '<g transform="translate(%s %s)"><g class="n5-pato" style="animation-delay:-%ds"><use href="#n5-d-pato" x="%d" y="%d"/></g></g>' % (ex, ey, k * 2, erx * .3 + k * 40, -ery * .2 + k * 14)
    for k in range(10):
        s += '<ellipse class="n5-nube-sombra" cx="%d" cy="%d" rx="%d" ry="%d" style="animation-duration:%ds;animation-delay:-%ds"/>' % (-300, random.randint(500, 1900), random.randint(180, 340), random.randint(80, 140), random.randint(110, 170), random.randint(0, 120))
    for k in range(6):
        i = random.randrange(40, len(rio_densos) - 40); x, y = rio_densos[i]
        if d_camino_a(x, y, 90) < 60: continue
        s += '<g transform="translate(%s %s)"><g class="n5-pez" style="animation-delay:-%.1fs;animation-duration:%.1fs"><path d="M-9 0Q0 -16 9 0Q0 -4 -9 0Z" fill="#fff4d6" stroke="#0c1f5c" stroke-width="1.4"/><path d="M-16 4Q0 8 16 4" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></g></g>' % (r1(x), r1(y), random.uniform(0, 8), random.uniform(6, 10))
    for (tx, ty) in tocones:
        for k in range(3):
            s += '<g transform="translate(%s %s)"><g class="n5-nota" style="animation-delay:%.1fs"><circle cx="0" cy="0" r="3.4" fill="#0c1f5c"/><path d="M3 0V-12l6 2" stroke="#0c1f5c" stroke-width="2" fill="none" stroke-linecap="round"/></g></g>' % (r1(tx + 8), r1(ty - 34), k * 1.3)
    s += '<g transform="translate(560 1300)"><g class="n5-paseo"><ellipse cx="0" cy="2" rx="14" ry="3" fill="#0c1f5c" opacity=".14"/><rect x="-5" y="-28" width="10" height="20" rx="4" fill="#1d4ed8"/><circle cx="0" cy="-34" r="6" fill="#f7d7b9"/><path d="M-6 -36q6 -8 12 0Z" fill="#6b3f1c"/><path d="M-3 -8V0M3 -8V0" stroke="#0c1f5c" stroke-width="3" stroke-linecap="round"/><ellipse cx="18" cy="-6" rx="8" ry="4.4" fill="#c98a4a"/><circle cx="26" cy="-9" r="3.4" fill="#c98a4a"/><path d="M12 -2V2M22 -2V2" stroke="#8a5528" stroke-width="2.4"/></g></g>'
    s += '<g class="n5-globo"><g transform="translate(-300 760)"><path d="M0 -70C-34 -70 -46 -40 -34 -10C-26 6 -10 14 -6 22H6C10 14 26 6 34 -10C46 -40 34 -70 0 -70Z" fill="#facc15"/><path d="M0 -70C-14 -66 -18 -34 -12 -6C-8 8 -4 16 -6 22H6C4 16 8 8 12 -6C18 -34 14 -66 0 -70Z" fill="#1d4ed8"/><path d="M-34 -10C-26 6 -10 14 -6 22H6C10 14 26 6 34 -10Z" fill="#ef7a63" opacity=".85"/><path d="M-6 22L-9 36M6 22L9 36" stroke="#8a5528" stroke-width="2"/><rect x="-10" y="36" width="20" height="12" rx="2" fill="#b5763c"/></g></g>'
    s += '<g class="n5-tranvia"><g transform="translate(-300 1930)"><rect x="-70" y="-30" width="64" height="26" rx="6" fill="#1d4ed8"/><rect x="2" y="-30" width="64" height="26" rx="6" fill="#1d4ed8"/><rect x="-70" y="-14" width="136" height="5" fill="#facc15"/><g fill="#bfe3f5"><rect x="-62" y="-26" width="12" height="9" rx="2"/><rect x="-44" y="-26" width="12" height="9" rx="2"/><rect x="-26" y="-26" width="12" height="9" rx="2"/><rect x="10" y="-26" width="12" height="9" rx="2"/><rect x="28" y="-26" width="12" height="9" rx="2"/><rect x="46" y="-26" width="12" height="9" rx="2"/></g><path d="M-30 -30L-18 -44M30 -30L42 -44" stroke="#2b2b3a" stroke-width="2.4"/><circle cx="-54" cy="-3" r="5" fill="#2b2b3a"/><circle cx="-14" cy="-3" r="5" fill="#2b2b3a"/><circle cx="18" cy="-3" r="5" fill="#2b2b3a"/><circle cx="54" cy="-3" r="5" fill="#2b2b3a"/></g></g>'
    return s
vida = '<svg class="n5-vida" id="n5-vida" viewBox="0 0 %d %d" width="%d" height="%d" aria-hidden="true">%s</svg>' % (W, H, W, H, viva())

juego = '''<svg class="n5-juego" id="n5-juego" viewBox="0 0 %d %d" width="%d" height="%d" aria-hidden="true">
  <defs>
    <symbol id="n5-coche-arriba" viewBox="-40 -24 80 48" overflow="visible">
      <rect x="-30" y="-12" width="64" height="32" rx="14" fill="#06113a" opacity=".22"/>
      <rect x="14" y="-20" width="14" height="8" rx="3" fill="#06113a"/><rect x="14" y="12" width="14" height="8" rx="3" fill="#06113a"/>
      <rect x="-26" y="-20" width="14" height="8" rx="3" fill="#06113a"/><rect x="-26" y="12" width="14" height="8" rx="3" fill="#06113a"/>
      <rect x="-32" y="-16" width="64" height="32" rx="14" fill="#facc15"/>
      <path d="M-32 4Q-32 16 -18 16H18Q32 16 32 4Z" fill="#e0a800" opacity=".5"/>
      <rect x="-24" y="-2.6" width="54" height="5.2" fill="#0c1f5c" opacity=".85"/>
      <path d="M6 -11L16 -9V9L6 11Z" fill="#0c1f5c"/>
      <path d="M-12 -3C-24 -9 -30 -3 -40 -9L-38 3C-30 1 -22 7 -12 5Z" fill="#ef7a63"/>
      <circle cx="-8" cy="0" r="8" fill="#0c1f5c"/><ellipse cx="-4" cy="-1.5" rx="3.6" ry="2.4" fill="#fff4d6" opacity=".9"/>
      <rect x="29" y="-12.5" width="4" height="7" rx="2" fill="#fff4d6"/><rect x="29" y="5.5" width="4" height="7" rx="2" fill="#fff4d6"/>
    </symbol>
  </defs>
  <!-- Barrera de la frontera: baja y se levanta al final -->
  <g transform="translate(%d %d)"><g class="n5-brazo">
    <rect x="-5" y="-74" width="10" height="78" rx="3" fill="#fff4d6" stroke="#06113a" stroke-width="2.5"/>
    <path d="M-5 -66H5V-56H-5ZM-5 -46H5V-36H-5ZM-5 -26H5V-16H-5Z" fill="#ef7a63"/>
    <rect x="-5" y="-74" width="10" height="78" rx="3" fill="none" stroke="#06113a" stroke-width="2.5"/>
  </g><circle r="8" fill="#06113a"/><circle r="4" fill="#facc15"/></g>
  <!-- Aro y flecha sobre la parada que toca -->
  <g id="n5-aro" class="oculto" transform="translate(0 0)">
    <ellipse class="n5-aro-onda" cx="0" cy="0" rx="48" ry="32" fill="none" stroke="#facc15" stroke-width="5"/>
    <ellipse cx="0" cy="0" rx="48" ry="32" fill="#facc15" opacity=".18"/>
    <g class="n5-flecha" transform="translate(0 -%d)"><path d="M0 14L-14 -6H14Z" fill="#facc15" stroke="#0c1f5c" stroke-width="3.4" stroke-linejoin="round"/></g>
  </g>
  <!-- Flecha que apunta hacia la parada que toca cuando está lejos -->
  <g id="n5-brujula" class="oculto" transform="translate(0 0)"><g id="n5-brujula-giro"><path d="M0 -13L34 0L0 13L8 0Z" fill="#facc15" stroke="#0c1f5c" stroke-width="3.4" stroke-linejoin="round"/></g></g>
  <!-- Coche visto desde arriba -->
  <g id="n5-coche" transform="translate(120 %d)"><use href="#n5-coche-arriba" x="-40" y="-24" width="80" height="48"/></g>
  <!-- Aviso: tecla para abrir, candado si aún no toca, o "momentáneamente cerrado" en el desvío -->
  <g id="n5-aviso" class="oculto" transform="translate(0 0)">
    <g id="n5-aviso-abre">
      <rect x="-72" y="-19" width="144" height="38" rx="19" fill="#fff" stroke="#0c1f5c" stroke-width="3"/>
      <text x="-52" y="6" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="16" fill="#0c1f5c">Apasă</text>
      <rect x="2" y="-11" width="60" height="22" rx="6" fill="#facc15" stroke="#0c1f5c" stroke-width="2.6"/>
      <text id="n5-aviso-tecla" x="32" y="5" text-anchor="middle" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="14" fill="#0c1f5c">Spațiu</text>
    </g>
    <g id="n5-aviso-no" class="oculto">
      <rect x="-62" y="-19" width="124" height="38" rx="19" fill="#fff" stroke="#0c1f5c" stroke-width="3"/>
      <g transform="translate(-38 0)"><path d="M-4.4 -2V-5.4a4.4 4.4 0 0 1 8.8 0V-2" fill="none" stroke="#0c1f5c" stroke-width="2.8" stroke-linecap="round"/><rect x="-6.6" y="-2" width="13.2" height="10" rx="2.4" fill="#0c1f5c"/></g>
      <text x="-22" y="6" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="16" fill="#0c1f5c">Încă nu</text>
    </g>
    <g id="n5-aviso-cerrado" class="oculto">
      <rect x="-104" y="-19" width="208" height="38" rx="19" fill="#fff" stroke="#0c1f5c" stroke-width="3"/>
      <g transform="translate(-80 0)"><path d="M0 -10L10 0L0 10L-10 0Z" fill="#facc15" stroke="#0c1f5c" stroke-width="2.4" stroke-linejoin="round"/></g>
      <text x="-62" y="6" font-family="Baloo 2, Nunito, sans-serif" font-weight="800" font-size="16" fill="#0c1f5c">Momentan indisponibil</text>
    </g>
    <path d="M-7 19L0 29L7 19Z" fill="#fff" stroke="#0c1f5c" stroke-width="3" stroke-linejoin="round"/><rect x="-5" y="15" width="10" height="6" fill="#fff"/>
  </g>
</svg>''' % (W, H, W, H, X_FRONTERA, py_g + 30, 118 * ESC + 58 + 6, inicio[1])

mini = '''<svg class="n5-mini" id="n5-mini" viewBox="0 0 %d %d" aria-hidden="true">
  <rect width="%d" height="%d" rx="60" fill="#c5dfa2"/>
  <rect width="%d" height="%d" fill="#8b9bd6" opacity=".55"/>
  <rect x="%d" width="%d" height="%d" fill="#f3e2a9"/>
  <use href="#n5-rio" opacity=".95"/>
  <use href="#n5-camino" opacity=".9"/>
  <circle cx="%s" cy="%s" r="46" fill="#fff" stroke="#0c1f5c" stroke-width="18" stroke-dasharray="26 22"/>
  %s
  <circle id="n5-mini-coche" r="62" cx="0" cy="0" fill="#facc15" stroke="#0c1f5c" stroke-width="22"/>
  <circle id="n5-mini-puerta" r="52" cx="%s" cy="%s" fill="#fff" stroke="#0c1f5c" stroke-width="22"/>
</svg>''' % (W, H, W, H, W, MURO_NORTE, X_FRONTERA, W - X_FRONTERA, H, r1(DESVIO[0]), r1(DESVIO[1]),
             ''.join('<circle class="n5-mini-p bloq" id="n5-mini-%d" r="62" cx="%s" cy="%s"/>' % (i, r1(sx), r1(sy)) for i, (sx, sy, bx, by) in enumerate(paradas_geo)),
             r1(PUERTA[0] + 80), r1(PUERTA[1]))

capas = '''
    <div class="n5-camara" id="n5-camara">
      %s
      %s
      %s
    </div>
    <div class="n5-grano" aria-hidden="true"></div>
    <div class="n5-minimapa" aria-hidden="true">%s</div>
''' % (mundo, vida, juego, mini)

seccion = '<section class="nivel" id="nivel-5" aria-labelledby="n5-titlu">\n' + capas + '\n' + UI + '</section>'
html = open(HTML, encoding='utf-8').read()
nuevo, n = re.subn(r'<section class="nivel" id="nivel-5"[\s\S]*?</section>', lambda m: seccion, html, count=1)
assert n == 1
open(HTML, 'w', encoding='utf-8', newline='').write(nuevo)
print('ok: sección %d KB; camino %d puntos; %d objetos; %d árboles; %d sólidos; %d campos; %d colinas; puentes %d; rejilla %d x %d; %d paradas' % (len(seccion) // 1024, len(densos), len(items), len(arboles), len(solidos), len(campos), n_colinas, len(puentes_geo), COLS, FILAS, N))
print('paradas:', [(r1(a), r1(b)) for a, b, c, d in paradas_geo], 'puerta', PUERTA, 'desvío', DESVIO, 'barrera', (BX, BY))
