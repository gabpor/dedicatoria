# Edificios nuevos del nivel 5 (el arco del parque, el banco con el ramo, el brunch y el billar) y el orden de las 13 paradas.
# Los usa genera_mundo_nivel5.py. No se publica.
from edificios_nivel5 import *   # noqa: F401,F403  (colores, sombra() y las nueve primeras funciones)

def e_arco():
    # Arco de triunfo del parque de Bruselas, de noche: tres arcos iluminados y la cuadriga arriba
    return sombra(60) + '''
<ellipse cx="0" cy="-34" rx="62" ry="44" fill="url(#n5-brillo)" opacity=".55"/>
<rect x="-56" y="-12" width="112" height="12" fill="#b9ab8a"/>
<rect x="-50" y="-60" width="100" height="50" fill="#e2d3a6"/><rect x="28" y="-60" width="22" height="50" fill="#cdbd8f" opacity=".6"/>
<path d="M-42 -10V-31a12 12 0 0 1 24 0V-10Z M-13 -10V-38a13 13 0 0 1 26 0V-10Z M18 -10V-31a12 12 0 0 1 24 0V-10Z" fill="#1d3a8a"/>
<path d="M-42 -31a12 12 0 0 1 24 0M-13 -38a13 13 0 0 1 26 0M18 -31a12 12 0 0 1 24 0" fill="none" stroke="#facc15" stroke-width="3.4" opacity=".9"/>
<g fill="#f3e7bf"><rect x="-52" y="-60" width="7" height="50"/><rect x="-18" y="-60" width="6" height="50"/><rect x="12" y="-60" width="6" height="50"/><rect x="45" y="-60" width="7" height="50"/></g>
<rect x="-55" y="-69" width="110" height="10" fill="#f3e7bf"/><path d="M-55 -64H55" stroke="#cdbd8f" stroke-width="2"/>
<rect x="-46" y="-86" width="92" height="17" fill="#e2d3a6"/><rect x="-20" y="-86" width="40" height="17" fill="#f3e7bf"/><path d="M-40 -78H-26M26 -78H40" stroke="#b9ab8a" stroke-width="2.4" stroke-dasharray="3 3"/>
<rect x="-15" y="-97" width="30" height="11" fill="#e2d3a6"/>
<path d="M-16 -97h32l-5 -9h-22Z" fill="#5aa88a"/>
<g fill="#5aa88a"><ellipse cx="-12" cy="-108" rx="4" ry="6.5"/><ellipse cx="-4" cy="-110" rx="4" ry="7"/><ellipse cx="4" cy="-110" rx="4" ry="7"/><ellipse cx="12" cy="-108" rx="4" ry="6.5"/></g>
<circle cx="0" cy="-117" r="3.6" fill="#5aa88a"/><path d="M-9 -112L0 -122L9 -112Z" fill="#4f9a7d"/>
<circle cx="-54" cy="-5" r="3.6" fill="#facc15"/><circle cx="54" cy="-5" r="3.6" fill="#facc15"/>'''

def e_parque():
    # El banco del parque con un ramo envuelto en papel de estraza, bajo un árbol
    return sombra(56) + '''
<ellipse cx="-30" cy="1" rx="22" ry="5" fill="#0c1f5c" opacity=".12"/>
<rect x="-38" y="-36" width="9" height="37" fill="#8a5528"/><rect x="-38" y="-36" width="3.4" height="37" fill="#6b3f1c" opacity=".6"/>
<circle cx="-33" cy="-62" r="25" fill="#5aa88a"/><circle cx="-51" cy="-48" r="16" fill="#6fb36f"/><circle cx="-16" cy="-52" r="17" fill="#4f9a7d"/><circle cx="-30" cy="-80" r="12" fill="#7bb369"/>
<circle cx="-44" cy="-66" r="5" fill="#e0b04a"/><circle cx="-22" cy="-70" r="4.4" fill="#e0b04a"/><circle cx="-36" cy="-48" r="3.6" fill="#e0b04a"/>
<path d="M-33 -88a25 25 0 0 1 24 22a25 25 0 0 1 -34 8Z" fill="#2b6f62" opacity=".2"/>
<g fill="#f5a04a"><ellipse cx="6" cy="-1.4" rx="4" ry="1.8" transform="rotate(-14 6 -1.4)"/><ellipse cx="22" cy="2" rx="3.6" ry="1.6" transform="rotate(12 22 2)"/><ellipse cx="56" cy="-1" rx="3.8" ry="1.7"/></g>
<rect x="-4" y="-27" width="56" height="4" rx="1.5" fill="#8a6a45"/><rect x="-4" y="-21" width="56" height="4" rx="1.5" fill="#9c7a52"/>
<rect x="-6" y="-14" width="60" height="4.4" rx="1.5" fill="#8a6a45"/><rect x="-6" y="-9" width="60" height="3.2" fill="#6b4f33"/>
<path d="M-4 -29V-4M50 -29V-4" stroke="#2b6f62" stroke-width="5.4" stroke-linecap="round"/><path d="M-6 -2h8M48 -2h8" stroke="#2b6f62" stroke-width="3" stroke-linecap="round"/>
<path d="M12 -15L24 -38L36 -32L26 -15Z" fill="#c9a36b"/><path d="M24 -38L36 -32L33 -27L22 -32Z" fill="#b08a55" opacity=".7"/>
<circle cx="24" cy="-41" r="4.4" fill="#fff4d6"/><circle cx="31" cy="-39" r="4.2" fill="#f4a3b5"/><circle cx="18" cy="-37" r="3.8" fill="#fff4d6"/><circle cx="29" cy="-45" r="3.4" fill="#fff4d6"/><path d="M22 -34L18 -26" stroke="#f4a3b5" stroke-width="2" stroke-linecap="round"/>'''

def e_brunch():
    # Terraza de brunch: muro de ladrillo con hiedra, sombrilla, y una mesa con bandeja, pan y un vaso
    return sombra(58) + '''
<rect x="-54" y="-88" width="108" height="76" fill="#a85b4a"/><rect x="26" y="-88" width="28" height="76" fill="#8a4538" opacity=".45"/>
<path d="M-54 -74H54M-54 -60H54M-54 -46H54M-54 -32H54M-54 -18H54" stroke="#8a4538" stroke-width="1.6" opacity=".55"/>
<g fill="#5aa88a"><circle cx="-48" cy="-78" r="9"/><circle cx="-40" cy="-68" r="7"/><circle cx="-50" cy="-58" r="8"/><circle cx="-44" cy="-44" r="6"/><circle cx="40" cy="-80" r="8"/><circle cx="48" cy="-70" r="7"/><circle cx="-24" cy="-84" r="6"/></g>
<g fill="#4f9a7d"><circle cx="-36" cy="-76" r="5"/><circle cx="-46" cy="-50" r="5"/><circle cx="46" cy="-62" r="5"/></g>
<rect x="-58" y="-14" width="116" height="14" fill="#cdbd8f"/>
<rect x="28" y="-72" width="3" height="62" fill="#2b2b3a"/><path d="M-2 -62Q29 -98 60 -62Z" fill="#1d3a8a"/><path d="M29 -80V-62M14 -76L8 -62M44 -76L50 -62" stroke="#0c1f5c" stroke-width="1.6"/><rect x="22" y="-70" width="14" height="6" fill="#ef7a63"/>
<rect x="-28" y="-26" width="74" height="5" rx="2" fill="#fff4d6" stroke="#0c1f5c" stroke-width="2"/><path d="M-22 -21V0M40 -21V0" stroke="#0c1f5c" stroke-width="3"/>
<rect x="-22" y="-33" width="44" height="7" rx="1.5" fill="#8b9bd6"/><rect x="-22" y="-33" width="44" height="2" fill="#b8c4dd"/>
<rect x="-17" y="-39" width="11" height="6" rx="1" fill="#f5a04a"/><rect x="-4" y="-40" width="11" height="7" rx="1" fill="#e8c65a"/><rect x="9" y="-38" width="10" height="5" rx="1" fill="#f5a04a"/>
<path d="M-15 -37l3 0M-1 -38l3 0M12 -36l3 0" stroke="#5aa88a" stroke-width="1.6" stroke-linecap="round"/>
<rect x="28" y="-45" width="11" height="19" rx="3.4" fill="#fff" stroke="#8b9bd6" stroke-width="2"/><rect x="28" y="-36" width="11" height="10" rx="2" fill="#fff4d6"/><path d="M36 -45L42 -56" stroke="#f4a3b5" stroke-width="2.4" stroke-linecap="round"/>
<rect x="-46" y="-22" width="9" height="22" rx="2" fill="#2b2b3a"/><rect x="48" y="-22" width="9" height="22" rx="2" fill="#2b2b3a"/>'''

def e_billar():
    # Sala de billar: paredes de madera, lámpara de flecos encendida y una mesa roja con las bolas
    flecos = ''.join('<path d="M%d -58V%d"/>' % (x, -46 - (x % 3)) for x in range(-20, 22, 4))
    return sombra(58) + '''
<rect x="-54" y="-88" width="108" height="64" fill="#5a3a22"/><path d="M-40 -88V-24M-26 -88V-24M-12 -88V-24M2 -88V-24M16 -88V-24M30 -88V-24M44 -88V-24" stroke="#4a2f1b" stroke-width="2"/>
<ellipse cx="0" cy="-50" rx="48" ry="30" fill="url(#n5-brillo)"/>
<path d="M0 -88V-72" stroke="#2b2b3a" stroke-width="2"/><path d="M-24 -58L-17 -72H17L24 -58Z" fill="#8a5528"/>
<g stroke="#facc15" stroke-width="2.2">''' + flecos + '''</g>
<rect x="-50" y="-82" width="22" height="13" rx="1.5" fill="#ef7a63"/><path d="M-46 -76H-32" stroke="#fff4d6" stroke-width="2.4"/>
<path d="M-56 -24L56 -24L62 -4L-62 -4Z" fill="#8a5528"/><path d="M-50 -22L50 -22L55 -7L-55 -7Z" fill="#e5533d"/><path d="M-50 -22L50 -22L51 -19L-51 -19Z" fill="#c4503f" opacity=".6"/>
<g fill="#0c1f5c"><circle cx="-50" cy="-22" r="3.4"/><circle cx="50" cy="-22" r="3.4"/><circle cx="-54" cy="-7" r="3.6"/><circle cx="54" cy="-7" r="3.6"/></g>
<path d="M8 -17l18 0l-9 -12Z" fill="none" stroke="#0c1f5c" stroke-width="2"/>
<g><circle cx="17" cy="-22.5" r="3.3" fill="#facc15"/><circle cx="13" cy="-18.6" r="3.3" fill="#1d4ed8"/><circle cx="21" cy="-18.6" r="3.3" fill="#ef7a63"/><circle cx="9" cy="-14.8" r="3.3" fill="#2b2b3a"/><circle cx="17" cy="-14.8" r="3.3" fill="#5aa88a"/><circle cx="25" cy="-14.8" r="3.3" fill="#f5a04a"/><circle cx="-18" cy="-13" r="3.6" fill="#fff4d6" stroke="#d6c9a3" stroke-width="1"/></g>
<path d="M-48 -9L-24 -13" stroke="#d9a867" stroke-width="2.6" stroke-linecap="round"/>
<g fill="#2b2b3a"><rect x="-56" y="-4" width="7" height="5"/><rect x="49" y="-4" width="7" height="5"/></g>'''

# Las trece paradas, en el orden del camino
PARADAS_ED = [e_parrilla, e_arco, e_buzon, e_eternidad, e_parque, e_mercadillo, e_brunch, e_billar, e_restaurante, e_abadia, e_aniversario, e_patinaje, e_casita]
