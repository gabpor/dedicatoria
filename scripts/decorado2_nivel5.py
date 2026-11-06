# Decorado extra del nivel 5: montañas, colinas, más animales y los detallitos que nos recuerdan a nosotros.
# Los usa genera_mundo_nivel5.py. No se publica.
import math

def sombra(rx, ry=6, dy=2):
    return '<ellipse cx="2" cy="%d" rx="%d" ry="%d" fill="#0c1f5c" opacity=".14"/>' % (dy, rx, ry)

SIM2 = {}

# ------------------------------------------------------------------ montañas (base centrada en el origen, hacia arriba)
def _pinos(xs, y, h=16, w=6):
    return ''.join('<path d="M%d %dl%d %dl%d %dZ" fill="#2b6f62"/>' % (x - w, y, w, -h, w, h) for x in xs)
SIM2['montana'] = (sombra(150, 12, 4) +
    '<path d="M-165 0L-124 -58L-94 -92L-62 -150L-32 -194L0 -236L28 -202L54 -160L86 -112L124 -70L165 0Z" fill="#8b9bd6"/>'
    '<path d="M0 -236L28 -202L54 -160L86 -112L124 -70L165 0L46 0L22 -92L10 -164Z" fill="#6672b8"/>'
    '<path d="M0 -236L-32 -194L-62 -150L-94 -92L-124 -58L-165 0L-84 0L-40 -78L-16 -150Z" fill="#a9b6e2" opacity=".7"/>'
    '<path d="M0 -236L28 -202L18 -192L6 -202L-6 -186L-16 -198L-32 -194L-14 -222Z" fill="#fff4d6"/><path d="M0 -236L28 -202L18 -192L6 -202L2 -214Z" fill="#d6dcf0"/>'
    '<path d="M-165 0L-136 -40L-108 -28L-80 -48L-50 -32L-16 -46L22 -30L56 -48L90 -32L124 -44L165 0Z" fill="#5aa88a"/>'
    + _pinos([-130, -98, -64, -30, 6, 40, 78, 112, 140], -30) + '<path d="M-165 0L-136 -40L-108 -28L-80 -48L-50 -32L-16 -46L22 -30L56 -48L90 -32L124 -44L165 0Z" fill="#2b6f62" opacity=".12"/>')
SIM2['montana2'] = (sombra(120, 10, 4) +
    '<path d="M-130 0L-98 -52L-70 -96L-44 -140L-22 -176L0 -150L22 -190L48 -226L70 -180L94 -128L112 -80L130 0Z" fill="#9aa8dc"/>'
    '<path d="M48 -226L70 -180L94 -128L112 -80L130 0L50 0L40 -100L36 -170Z" fill="#6f7fc0"/><path d="M22 -190L48 -226L36 -170L40 -100L22 -60L10 -110Z" fill="#7f8bd0" opacity=".6"/>'
    '<path d="M-22 -176L0 -150L22 -190L28 -178L16 -168L6 -176L-6 -158L-14 -172Z" fill="#fff4d6"/><path d="M48 -226L70 -180L62 -172L52 -184L44 -176L38 -190Z" fill="#fff4d6"/>'
    '<path d="M-130 0L-104 -34L-80 -24L-54 -42L-26 -28L2 -44L34 -28L66 -44L96 -30L130 0Z" fill="#6fb36f"/>' + _pinos([-100, -70, -40, -8, 24, 56, 90], -28, 14, 5))
SIM2['montana3'] = (sombra(96, 9, 4) +
    '<path d="M-100 0L-72 -44L-48 -86L-24 -128L0 -166L26 -130L50 -92L78 -50L100 0Z" fill="#a9b6e2"/>'
    '<path d="M0 -166L26 -130L50 -92L78 -50L100 0L34 0L18 -70L8 -120Z" fill="#7f8bd0"/>'
    '<path d="M0 -166L14 -148L4 -142L-6 -150L-14 -140L-24 -128L-8 -150Z" fill="#fff4d6"/>'
    '<path d="M-100 0L-78 -30L-52 -22L-26 -38L0 -26L28 -40L56 -26L100 0Z" fill="#6fb36f"/>' + _pinos([-72, -44, -14, 18, 50, 76], -24, 12, 5))
SIM2['roca'] = sombra(18, 4, 1) + '<path d="M-16 0L-12 -14L-2 -20L10 -16L17 -4L14 0Z" fill="#a5aec8"/><path d="M-2 -20L10 -16L17 -4L14 0L2 0L4 -10Z" fill="#7f8bb5"/><path d="M-12 -14L-2 -20L-6 -10Z" fill="#c9d0e4"/>'
SIM2['roca2'] = sombra(12, 3, 1) + '<path d="M-10 0L-7 -9L2 -13L9 -7L10 0Z" fill="#b6bdd2"/><path d="M2 -13L9 -7L10 0L3 0L5 -7Z" fill="#8b95b8"/>'

# ------------------------------------------------------------------ más vida
SIM2['caballo'] = (sombra(28, 5) +
    '<rect x="-20" y="-30" width="40" height="18" rx="9" fill="#a0653a"/><path d="M14 -28L24 -42L31 -38L26 -26Z" fill="#a0653a"/><path d="M22 -42L33 -45L36 -38L28 -36Z" fill="#8a5528"/>'
    '<path d="M16 -40Q10 -48 6 -40" stroke="#4a2f1b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-20 -26Q-30 -22 -28 -10" stroke="#4a2f1b" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<g stroke="#6b3f1c" stroke-width="4" stroke-linecap="round"><path d="M-14 -14V-1M-6 -14V-1M8 -14V-1M16 -14V-1"/></g><circle cx="30" cy="-40" r="1.2" fill="#0c1f5c"/>')
SIM2['ciervo'] = (sombra(22, 4) +
    '<rect x="-14" y="-26" width="28" height="14" rx="7" fill="#c98a4a"/><path d="M10 -24L18 -38L25 -35L19 -22Z" fill="#c98a4a"/><ellipse cx="25" cy="-37" rx="6" ry="4" fill="#c98a4a"/>'
    '<g stroke="#8a5528" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M22 -40L19 -50M19 -50L15 -52M19 -50L22 -55M26 -40L28 -50M28 -50L32 -52M28 -50L26 -56"/></g>'
    '<g stroke="#8a5528" stroke-width="3" stroke-linecap="round"><path d="M-9 -13V-1M-3 -13V-1M5 -13V-1M10 -13V-1"/></g><circle cx="-14" cy="-22" r="3" fill="#fff4d6"/><circle cx="28" cy="-38" r="1.1" fill="#0c1f5c"/>')
SIM2['gallina'] = '<ellipse cx="0" cy="-8" rx="8" ry="7" fill="#fff4d6"/><circle cx="7" cy="-15" r="4" fill="#fff4d6"/><path d="M10 -15l5 1.6l-5 1.4Z" fill="#f5a04a"/><path d="M5 -20l2 -3l2 3Z" fill="#ef7a63"/><path d="M-8 -10l-6 -4l1 7Z" fill="#e8d9b0"/><path d="M-2 0V-2M3 0V-2" stroke="#f5a04a" stroke-width="1.6"/>'
SIM2['cisnes'] = (
    '<ellipse cx="-14" cy="-6" rx="14" ry="7" fill="#fff"/><ellipse cx="14" cy="-6" rx="14" ry="7" fill="#fff"/>'
    '<path d="M-6 -8C-14 -18 -26 -30 -14 -42C-6 -48 0 -42 0 -34" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>'
    '<path d="M6 -8C14 -18 26 -30 14 -42C6 -48 0 -42 0 -34" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>'
    '<path d="M-6 -8C-14 -18 -26 -30 -14 -42C-6 -48 0 -42 0 -34" stroke="#dbe4f2" stroke-width="1.6" fill="none"/><path d="M6 -8C14 -18 26 -30 14 -42C6 -48 0 -42 0 -34" stroke="#dbe4f2" stroke-width="1.6" fill="none"/>'
    '<path d="M-17 -42l-6 1.6l5 2.4Z M17 -42l6 1.6l-5 2.4Z" fill="#f5a04a"/><circle cx="-14" cy="-43" r="1" fill="#0c1f5c"/><circle cx="14" cy="-43" r="1" fill="#0c1f5c"/>')
SIM2['flor-azul'] = ('<path d="M0 0V-13" stroke="#2b6f62" stroke-width="2.2" stroke-linecap="round"/><path d="M0 -4C-6 -5 -7 -9 -5 -10C-2 -8 -1 -6 0 -4Z" fill="#5aa88a"/>'
    '<g fill="#5b8ff0"><circle cx="0" cy="-20" r="5"/><circle cx="6.2" cy="-15.6" r="5"/><circle cx="3.8" cy="-8.8" r="5"/><circle cx="-3.8" cy="-8.8" r="5"/><circle cx="-6.2" cy="-15.6" r="5"/></g>'
    '<g fill="#8fb4f7" opacity=".8"><circle cx="-1" cy="-21" r="1.2"/><circle cx="7" cy="-16" r="1.2"/><circle cx="-5" cy="-14" r="1.2"/></g><circle cx="0" cy="-14.4" r="3.2" fill="#fff4d6"/>')
SIM2['girasol'] = ('<path d="M0 0V-22" stroke="#2b6f62" stroke-width="2.6" stroke-linecap="round"/><path d="M0 -8C8 -10 10 -15 7 -16C3 -14 1 -11 0 -8Z" fill="#5aa88a"/>'
    '<g fill="#facc15"><circle cx="0" cy="-33" r="5"/><circle cx="7" cy="-30.6" r="5"/><circle cx="9.6" cy="-24" r="5"/><circle cx="4.6" cy="-19.4" r="5"/><circle cx="-4.6" cy="-19.4" r="5"/><circle cx="-9.6" cy="-24" r="5"/><circle cx="-7" cy="-30.6" r="5"/></g>'
    '<circle cx="0" cy="-26" r="6.4" fill="#6b3f1c"/><circle cx="0" cy="-26" r="3" fill="#8a5528"/>')
SIM2['manta'] = ('<path d="M-30 0L-22 -16H34L26 0Z" fill="url(#n5-cuadros)" stroke="#0c1f5c" stroke-width="1.8" stroke-linejoin="round"/>'
    '<rect x="-14" y="-24" width="9" height="12" rx="3" fill="#fff" stroke="#8b9bd6" stroke-width="1.6"/><rect x="-14" y="-20" width="9" height="8" rx="2" fill="#8cc17a"/><path d="M-9 -24L-5 -31" stroke="#f4a3b5" stroke-width="2" stroke-linecap="round"/>'
    '<rect x="1" y="-22" width="16" height="8" rx="1.6" fill="#e8c65a"/><path d="M4 -21l3 0M10 -20l3 0" stroke="#5aa88a" stroke-width="1.4"/>'
    '<circle cx="24" cy="-22" r="6" fill="#bfe3f5" stroke="#c9a24b" stroke-width="2"/><path d="M24 -16V-9" stroke="#c9a24b" stroke-width="2.4" stroke-linecap="round"/>')
SIM2['tocon-disco'] = (sombra(20, 4, 1) + '<path d="M-14 0L-12 -14H12L14 0Z" fill="#a0653a"/><ellipse cx="0" cy="-14" rx="13" ry="4" fill="#d9a867"/><ellipse cx="0" cy="-14" rx="9" ry="2.6" fill="#b5763c" opacity=".5"/>'
    '<rect x="-12" y="-24" width="24" height="9" rx="2" fill="#8a5528"/><ellipse cx="-1" cy="-24" rx="10" ry="3" fill="#2b2b3a"/><ellipse cx="-1" cy="-24" rx="3" ry="1" fill="#ef7a63"/><path d="M8 -24L14 -30" stroke="#d9a867" stroke-width="2" stroke-linecap="round"/>')
SIM2['bola8'] = sombra(7, 2, 1) + '<circle cx="0" cy="-6" r="6" fill="#2b2b3a"/><circle cx="0" cy="-6" r="2.6" fill="#fff"/><path d="M-1 -7.4h2M0 -8v3" stroke="#2b2b3a" stroke-width=".8"/><rect x="9" y="-6" width="7" height="6" rx="1" fill="#5b8ff0"/><rect x="9" y="-6" width="7" height="2" fill="#8fb4f7"/>'
SIM2['atomium'] = ('<g stroke="#9aa8c9" stroke-width="3"><path d="M0 -150L0 -30M0 -150L-34 -76M0 -150L34 -76M-34 -76L0 -30M34 -76L0 -30M-34 -76L34 -76"/></g>'
    '<g fill="#c9d0e4"><circle cx="0" cy="-156" r="12"/><circle cx="-36" cy="-76" r="12"/><circle cx="36" cy="-76" r="12"/><circle cx="0" cy="-30" r="12"/><circle cx="0" cy="-92" r="12"/></g>'
    '<g fill="#e6eaf5" opacity=".8"><circle cx="-3" cy="-159" r="4"/><circle cx="-39" cy="-79" r="4"/><circle cx="33" cy="-79" r="4"/><circle cx="-3" cy="-33" r="4"/><circle cx="-3" cy="-95" r="4"/></g>')
SIM2['arco-lejano'] = ('<rect x="-60" y="-14" width="120" height="14" fill="#c9d0e4"/><rect x="-52" y="-62" width="104" height="50" fill="#d6dcec"/><path d="M-42 -12V-32a12 12 0 0 1 24 0V-12Z M-13 -12V-40a13 13 0 0 1 26 0V-12Z M18 -12V-32a12 12 0 0 1 24 0V-12Z" fill="#9aa8c9"/>'
    '<rect x="-56" y="-72" width="112" height="10" fill="#e6eaf5"/><rect x="-46" y="-90" width="92" height="18" fill="#d6dcec"/><path d="M-14 -90h28l-4 -12h-20Z" fill="#9aa8c9"/>')
SIM2['pino-nevado'] = sombra(12, 3, 1) + '<rect x="-2" y="-8" width="4" height="9" fill="#6b3f1c"/><path d="M0 -50L-14 -22H14Z M0 -36L-18 -8H18Z" fill="#2b6f62"/><path d="M0 -50L-6 -38H6Z M0 -36L-8 -24H8Z" fill="#fff4d6"/>'

def colina(x, y, rx, ry):
    """Una colina suave (no bloquea): sombra, cuerpo con degradado, luz arriba a la izquierda y unas hierbas."""
    return ('<g transform="translate(%d %d)"><ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#2b6f62" opacity=".13"/>'
            '<ellipse cx="0" cy="0" rx="%d" ry="%d" fill="url(#n5-g-colina)"/><ellipse cx="%d" cy="%d" rx="%d" ry="%d" fill="#eaf4cf" opacity=".55"/>'
            '<path d="M%d %dQ%d %d %d %d" stroke="#9cc57a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/></g>') % (
        x, y, round(rx * .09), round(ry * .22), rx, ry, rx, ry, round(-rx * .28), round(-ry * .38), round(rx * .42), round(ry * .3),
        round(-rx * .6), round(ry * .1), 0, round(-ry * .5), round(rx * .6), round(ry * .1))

def corazon_puntos(cx, cy, escala, paso):
    """Puntos con forma de corazón (para un campo de amapolas)."""
    pts = []
    n = int(1.4 * escala / paso)
    for j in range(-n, n + 1):
        for i in range(-n, n + 1):
            u, v = i * paso / escala * 1.0, -j * paso / escala * 1.0
            f = (u * u + v * v - 1) ** 3 - u * u * v ** 3
            if f <= 0: pts.append((cx + i * paso, cy + j * paso))
    return pts
