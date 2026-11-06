# Edificios de las nueve paradas del nivel 5 (símbolos SVG con el origen en la base centrada).
# Los usa genera_mundo_nivel5.py. No se publica.
CR, AZ, AO, AM, AMB, CO, COD, RS = '#fff4d6', '#1d4ed8', '#0c1f5c', '#facc15', '#e0a800', '#ef7a63', '#c4503f', '#f4a3b5'
PIE, PIED, MAD, MADC = '#d8cdb0', '#b9ab8a', '#8a5528', '#d9a867'

def sombra(rx=54): return '<ellipse cx="0" cy="-2" rx="%d" ry="7" fill="#0c1f5c" opacity=".16"/>' % rx

def e_parrilla():
    return sombra() + '''
<rect x="-50" y="-76" width="100" height="58" rx="3" fill="#c9d1e3"/><rect x="-50" y="-76" width="100" height="8" rx="3" fill="#aab4cf"/><rect x="32" y="-68" width="18" height="50" fill="#b5bfd8" opacity=".6"/>
<path d="M14 -66C8 -74 20 -78 14 -90M24 -66C18 -74 30 -78 24 -90M34 -66C28 -74 40 -78 34 -90" stroke="#8b9bd6" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M4 -44L9 -64H35L40 -44Z" fill="#1d2f7a"/><rect x="2" y="-46" width="40" height="5" rx="2.5" fill="#ef7a63"/>
<path d="M2 -42H42V-31Q42 -23 22 -23Q2 -23 2 -31Z" fill="#0c1f5c"/><rect x="17" y="-72" width="10" height="3" rx="1.5" fill="#facc15" transform="translate(0 6)"/>
<path d="M10 -25L6 -3M34 -25L38 -3" stroke="#0c1f5c" stroke-width="3.2" stroke-linecap="round"/>
<rect x="-52" y="-28" width="46" height="16" rx="2" fill="url(#n5-cuadros)" stroke="#0c1f5c" stroke-width="2"/>
<path d="M-48 -12V-2M-10 -12V-2" stroke="#0c1f5c" stroke-width="3" stroke-linecap="round"/>
<path d="M-42 -28a8 6 0 0 1 16 0Z" fill="#f5a04a"/><rect x="-43" y="-28" width="18" height="3" rx="1.5" fill="#8a5528"/><rect x="-42" y="-25" width="16" height="3" rx="1.5" fill="#f5a04a"/>'''

def e_buzon():
    return sombra(40) + '''
<path d="M-48 -4Q-30 -12 -10 -4Q-26 0 -48 -4Z" fill="#5aa88a"/><path d="M12 -2Q30 -10 48 -2Q30 2 12 -2Z" fill="#5aa88a"/>
<rect x="-4" y="-44" width="8" height="44" fill="#8a5528"/><rect x="-4" y="-44" width="3" height="44" fill="#6b3f1c"/>
<path d="M-26 -66a26 26 0 0 1 52 0V-42H-26Z" fill="#1d4ed8"/><path d="M0 -92a26 26 0 0 1 26 26V-42H0Z" fill="#0c1f5c" opacity=".22"/>
<rect x="-15" y="-60" width="30" height="5" rx="2.5" fill="#0c1f5c"/><circle cx="-14" cy="-48" r="2" fill="#facc15"/>
<rect x="27" y="-84" width="3" height="26" fill="#0c1f5c"/><rect x="30" y="-84" width="15" height="10" rx="1.5" fill="#ef7a63"/>
<rect x="-52" y="-24" width="24" height="17" rx="2" fill="#fff4d6" stroke="#0c1f5c" stroke-width="2.2"/><path d="M-52 -24L-40 -14L-28 -24" fill="none" stroke="#0c1f5c" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M-60 -90h36a8 8 0 0 1 8 8v12a8 8 0 0 1 -8 8h-22l-10 9v-9a8 8 0 0 1 -4 -8v-12a8 8 0 0 1 0 0Z" fill="#fff4d6" stroke="#0c1f5c" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="-46" cy="-76" r="2.6" fill="#0c1f5c"/><circle cx="-37" cy="-76" r="2.6" fill="#0c1f5c"/><circle cx="-28" cy="-76" r="2.6" fill="#0c1f5c"/>
<path d="M-8 -94C-14 -102 -26 -96 -18 -88L-8 -80L2 -88C10 -96 -2 -102 -8 -94Z" fill="#ef7a63" transform="translate(30 4) scale(.7)"/>'''

def e_eternidad():
    return sombra(46) + '''
<path d="M-26 0L-19 -28H19L26 0Z" fill="#d8cdb0"/><path d="M0 -28H19L26 0H0Z" fill="#b9ab8a" opacity=".55"/><rect x="-23" y="-35" width="46" height="8" rx="2.5" fill="#efe4c8"/>
<path d="M0 -64C-10 -84 -36 -84 -36 -64C-36 -44 -10 -44 0 -64C10 -84 36 -84 36 -64C36 -44 10 -44 0 -64Z" fill="none" stroke="#ef7a63" stroke-width="8" stroke-linejoin="round"/>
<path d="M0 -64C-10 -84 -36 -84 -36 -64C-36 -44 -10 -44 0 -64C10 -84 36 -84 36 -64C36 -44 10 -44 0 -64Z" fill="none" stroke="#facc15" stroke-width="3" stroke-linejoin="round"/>
<path d="M-46 -90l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3Z M44 -100l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5Z M50 -50l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#facc15"/>
<path d="M-48 0V-24" stroke="#2b6f62" stroke-width="3" stroke-linecap="round"/><path d="M-48 -10C-58 -12 -58 -20 -52 -22C-50 -16 -49 -14 -48 -10Z" fill="#5aa88a"/>
<g transform="translate(-48 -30)"><circle cx="0" cy="-8" r="6.5" fill="#5b8ff0"/><circle cx="7.6" cy="-2.5" r="6.5" fill="#5b8ff0"/><circle cx="4.7" cy="6.5" r="6.5" fill="#5b8ff0"/><circle cx="-4.7" cy="6.5" r="6.5" fill="#5b8ff0"/><circle cx="-7.6" cy="-2.5" r="6.5" fill="#5b8ff0"/><circle cx="0" cy="0" r="4" fill="#fff4d6"/></g>'''

def e_mercadillo():
    rayas = ''
    for i in range(8):
        x0t = -48 + i * 12; x1t = x0t + 12
        x0b = -56 + i * 14; x1b = x0b + 14
        rayas += '<path d="M%g -88L%g -88L%g -62L%g -62Z" fill="%s"/>' % (x0t, x1t, x1b, x0b, AZ if i % 2 == 0 else CR)
    festones = ''.join('<circle cx="%g" cy="-62" r="7" fill="%s"/>' % (-49 + i * 14, AZ if i % 2 == 0 else CR) for i in range(8))
    return sombra(58) + '''
<rect x="-52" y="-72" width="4" height="72" fill="#8a5528"/><rect x="48" y="-72" width="4" height="72" fill="#8a5528"/>''' + rayas + festones + '''
<rect x="-52" y="-28" width="104" height="28" fill="#b5763c"/><rect x="-54" y="-32" width="108" height="6" rx="2" fill="#d9a867"/>
<rect x="-44" y="-42" width="36" height="10" rx="2" fill="#8a5528"/><ellipse cx="-28" cy="-43" rx="14" ry="4" fill="#0c1f5c"/><ellipse cx="-28" cy="-43" rx="4" ry="1.4" fill="#ef7a63"/><path d="M-14 -50L-20 -43" stroke="#e0a800" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="8" cy="-48" r="11" fill="#bfe3f5" stroke="#c9a24b" stroke-width="3"/><path d="M3 -52a8 8 0 0 1 6 -4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="6" y="-37" width="4" height="7" rx="2" fill="#c9a24b"/>
<path d="M30 -32V-46" stroke="#0c1f5c" stroke-width="3"/><path d="M22 -48L38 -48L34 -60H26Z" fill="#facc15"/>
<path d="M44 -32q-7 -6 -3 -14h8q4 8 -3 14Z" fill="#ef7a63"/>'''

def e_restaurante():
    crema = ''.join('<path d="M%.1f -58H%.1fL%.1f -44H%.1fZ" fill="#fff4d6"/>' % (-50 + i * 33.34, -33.34 + i * 33.34, (-33.34 + i * 33.34) * 1.12, (-50 + i * 33.34) * 1.12) for i in range(3))
    return sombra(54) + '''
<rect x="-46" y="-72" width="92" height="72" fill="#fff4d6"/><rect x="26" y="-72" width="20" height="72" fill="#d9cba3" opacity=".5"/><rect x="-50" y="-80" width="100" height="10" rx="2" fill="#0c1f5c"/>
<path d="M-50 -58H50L56 -44H-56Z" fill="#ef7a63"/>''' + crema + '''
<path d="M-56 -44a7 7 0 0 0 14 0a7 7 0 0 0 14 0a7 7 0 0 0 14 0a7 7 0 0 0 14 0a7 7 0 0 0 14 0a7 7 0 0 0 14 0a7 7 0 0 0 14 0a7 7 0 0 0 14 0Z" fill="#ef7a63"/>
<rect x="-38" y="-38" width="30" height="24" rx="3" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2.2"/><path d="M-23 -38V-14M-38 -26H-8" stroke="#0c1f5c" stroke-width="2"/>
<rect x="10" y="-38" width="22" height="38" rx="3" fill="#1d4ed8"/><circle cx="27" cy="-18" r="2" fill="#facc15"/>
<path d="M-44 -86v6M-30 -84v4M-16 -86v6M-2 -84v4M12 -86v6" stroke="#0c1f5c" stroke-width="1.5"/><circle cx="-44" cy="-88" r="3" fill="#facc15"/><circle cx="-30" cy="-86" r="3" fill="#facc15"/><circle cx="-16" cy="-88" r="3" fill="#facc15"/><circle cx="-2" cy="-86" r="3" fill="#facc15"/><circle cx="12" cy="-88" r="3" fill="#facc15"/>
<rect x="-56" y="-14" width="10" height="14" rx="2" fill="#b5763c"/><rect x="-6" y="-14" width="10" height="14" rx="2" fill="#b5763c"/>
<ellipse cx="-26" cy="-10" rx="13" ry="4" fill="#fff4d6" stroke="#0c1f5c" stroke-width="2"/><path d="M-26 -10V-2" stroke="#0c1f5c" stroke-width="2.5"/>
<rect x="-27.5" y="-24" width="3" height="12" fill="#fff4d6" stroke="#0c1f5c" stroke-width="1"/><ellipse cx="-26" cy="-28" rx="2.8" ry="4.6" fill="#facc15"/>'''

def e_abadia():
    return sombra(60) + '''
<rect x="-50" y="-48" width="100" height="48" fill="#d8cdb0"/><rect x="26" y="-48" width="24" height="48" fill="#b9ab8a" opacity=".55"/>
<path d="M-54 -48L-34 -64H-16V-48Z" fill="#5a6fb0"/><path d="M54 -48L34 -64H16V-48Z" fill="#46599b"/>
<rect x="-15" y="-86" width="30" height="86" fill="#e2d8bd"/><rect x="2" y="-86" width="13" height="86" fill="#b9ab8a" opacity=".45"/>
<path d="M-20 -86L0 -108L20 -86Z" fill="#5a6fb0"/><path d="M0 -108L20 -86H0Z" fill="#46599b"/><rect x="-1.5" y="-118" width="3" height="12" fill="#facc15"/><rect x="-5" y="-114" width="10" height="3" fill="#facc15"/>
<path d="M-9 0V-22a9 9 0 0 1 18 0V0Z" fill="#5a3a22"/><path d="M-5 -66v-12a5 5 0 0 1 10 0v12Z" fill="#7f8bb5"/><path d="M-5 -46v-12a5 5 0 0 1 10 0v12Z" fill="#7f8bb5"/>
<path d="M-42 -14v-16a5 5 0 0 1 10 0v16Z M-28 -14v-16a5 5 0 0 1 10 0v16Z M18 -14v-16a5 5 0 0 1 10 0v16Z M32 -14v-16a5 5 0 0 1 10 0v16Z" fill="#7f8bb5"/>
<rect x="12" y="-24" width="46" height="4" rx="1.5" fill="#8a5528"/><rect x="12" y="-14" width="46" height="5" rx="1.5" fill="#b5763c"/><path d="M16 -9V-1M54 -9V-1M16 -24V-14M54 -24V-14" stroke="#6b3f1c" stroke-width="3" stroke-linecap="round"/>
<rect x="26" y="-30" width="18" height="12" rx="1.5" fill="#fff4d6" stroke="#0c1f5c" stroke-width="2" transform="rotate(-6 35 -24)"/><path d="M26 -30L35 -23L44 -30" fill="none" stroke="#0c1f5c" stroke-width="2" stroke-linejoin="round" transform="rotate(-6 35 -24)"/><circle cx="35" cy="-23" r="2.8" fill="#ef7a63" transform="rotate(-6 35 -24)"/>'''

def e_aniversario():
    return sombra(46) + '''
<path d="M-38 -104a16 16 0 1 0 16 16a12.5 12.5 0 1 1 -16 -16Z" fill="#fff4d6"/><path d="M-6 -100l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8 -4.6 -4.6 -1.8 4.6 -1.8Z M-52 -66l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4Z" fill="#facc15"/>
<circle cx="34" cy="-86" r="26" fill="url(#n5-brillo)"/><rect x="32" y="-78" width="4" height="78" fill="#0c1f5c"/><path d="M25 -78H43L40 -90H28Z" fill="#0c1f5c"/><circle cx="34" cy="-88" r="4.5" fill="#facc15"/>
<path d="M-4 -52C-18 -68 -36 -50 -20 -38L-4 -22L12 -38C28 -50 10 -68 -4 -52Z" fill="#ef7a63"/><path d="M-22 -54a8 7 0 0 1 8 -4" stroke="#fff4d6" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M-40 -6V-14C-40 -22 -34 -26 -26 -26H-10C-2 -26 4 -22 4 -14V-6Z" fill="#facc15"/><path d="M-34 -22H0L-3 -14H-31Z" fill="#0c1f5c"/><rect x="-37" y="-12" width="8" height="4" rx="2" fill="#fff4d6"/><rect x="-7" y="-12" width="8" height="4" rx="2" fill="#fff4d6"/>
<rect x="-42" y="-10" width="8" height="10" rx="2.5" fill="#0c1f5c"/><rect x="-2" y="-10" width="8" height="10" rx="2.5" fill="#0c1f5c"/>'''

def e_patinaje():
    return sombra(58) + '''
<ellipse cx="0" cy="-14" rx="56" ry="17" fill="#0c1f5c" opacity=".2" transform="translate(0 3)"/>
<ellipse cx="0" cy="-14" rx="56" ry="17" fill="#fff4d6"/><ellipse cx="0" cy="-14" rx="49" ry="12.5" fill="#cfe6ff"/>
<path d="M-38 -14Q-14 -22 10 -16T40 -13M-30 -10Q-6 -6 18 -9" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>
<path d="M-14 -88H8V-62L26 -54V-34H-16Z" fill="#fff4d6" stroke="#0c1f5c" stroke-width="3" stroke-linejoin="round"/>
<path d="M-14 -70H8M-14 -62H8M-14 -78H8" stroke="#0c1f5c" stroke-width="2" opacity=".35"/><rect x="-16" y="-38" width="42" height="5" rx="2" fill="#ef7a63"/>
<path d="M-22 -26H32" stroke="#8b9bd6" stroke-width="4" stroke-linecap="round"/><path d="M-10 -34V-27M20 -34V-27" stroke="#8b9bd6" stroke-width="3"/>
<g stroke="#9ec5f5" stroke-width="2.6" stroke-linecap="round"><path d="M-50 -70V-52M-58 -61H-42M-56 -67L-44 -55M-56 -55L-44 -67"/><path d="M46 -90V-76M40 -83H52M42 -88L50 -78M42 -78L50 -88"/></g>'''

def e_casita():
    return sombra(40) + '''
<rect x="14" y="-84" width="10" height="26" fill="#b9ab8a"/><rect x="-30" y="-46" width="60" height="46" fill="#f7d7b9"/><rect x="12" y="-46" width="18" height="46" fill="#dbb994" opacity=".55"/>
<path d="M-40 -46L0 -82L40 -46Z" fill="#ef7a63"/><path d="M0 -82L40 -46H0Z" fill="#c4503f" opacity=".55"/>
<rect x="-9" y="-30" width="18" height="30" rx="2.5" fill="#1d4ed8"/><circle cx="5" cy="-14" r="1.8" fill="#facc15"/>
<rect x="-26" y="-36" width="13" height="13" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/><rect x="13" y="-36" width="13" height="13" rx="2" fill="#ffe9a8" stroke="#0c1f5c" stroke-width="2"/>
<circle cx="-24" cy="-4" r="7" fill="#5aa88a"/><circle cx="-14" cy="-3" r="5" fill="#5fc4b0"/>'''

EDIF = [e_parrilla, e_buzon, e_eternidad, e_mercadillo, e_restaurante, e_abadia, e_aniversario, e_patinaje, e_casita]


ESC = 0.9
