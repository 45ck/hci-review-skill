import json
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[2]
(ROOT/'assets/icons/line').mkdir(parents=True, exist_ok=True)

def path(d, fill='front', **attrs):
    return {'tag': 'path', 'props': {'d': d, 'fill': fill, **attrs}}

def shape(tag, **attrs):
    return {'tag': tag, 'props': attrs}

def rim(d, **attrs):
    return path(d, 'none', stroke='rim', strokeWidth=1.4, strokeLinecap='round', strokeLinejoin='round', **attrs)

def slab(offset, face='front'):
    return [
        path('M7 20L29 32Q32 34 35 32L57 20V25Q57 28 54 30L35 40Q32 42 29 40L10 30Q7 28 7 25Z', 'side', transform=f'translate(0 {offset})'),
        path('M10 11L29 1Q32-1 35 1L54 11Q60 14 54 17L35 27Q32 29 29 27L10 17Q4 14 10 11Z', face, transform=f'translate(0 {offset+4})', stroke='rim', strokeWidth=1.35),
        rim('M10 15L29 25Q32 27 35 25L54 15', transform=f'translate(0 {offset+4})', opacity=.7),
    ]

def cube(x, y, w=22, height=16, warm=False):
    h=w/2
    return [
        path(f'M{x} {y}L{x+h} {y+6}V{y+height+6}L{x} {y+height}Q{x-1} {y+height-1} {x-1} {y+height-3}V{y+2}Q{x-1} {y+1} {x} {y}Z', 'peach' if warm else 'front', stroke='rim', strokeWidth=.9),
        path(f'M{x+h} {y+6}L{x+w} {y}V{y+height-2}Q{x+w} {y+height} {x+w-2} {y+height+1}L{x+h} {y+height+6}Z', 'peachSide' if warm else 'side', stroke='edge', strokeWidth=.8),
        path(f'M{x} {y}L{x+h-2} {y-5}Q{x+h} {y-6} {x+h+2} {y-5}L{x+w} {y}L{x+h+2} {y+5}Q{x+h} {y+6} {x+h-2} {y+5}Z', 'peach' if warm else 'top', stroke='rim', strokeWidth=1),
    ]

art = {}
art['layers'] = slab(22) + slab(11, 'peach') + slab(0, 'top')
art['folder'] = [
    path('M13 11Q13 7 18 8L29 11Q31 12 32 15L34 18L51 23Q56 24 56 30L58 49Q58 53 53 56L46 59L12 47Z','side',stroke='edge',strokeWidth=1),
    path('M10 15Q10 11 14 12L26 15Q28 16 29 19L31 22L48 27Q52 28 52 33L53 53L10 45Z','front',stroke='rim',strokeWidth=1.4),
    path('M20 21Q20 18 23 19L44 25Q47 26 47 29L46 48L20 42Z','peach',stroke='rim',strokeWidth=1),
    path('M8 28Q8 24 13 26L45 35Q49 36 50 40L54 54Q55 58 50 58L13 48Q9 47 9 43Z','front',stroke='rim',strokeWidth=1.5),
    rim('M12 28L44 37Q47 38 48 41'),
]
art['grid'] = cube(7,11) + cube(35,11) + cube(7,37) + cube(35,37)
art['settings'] = [
    path('M17 5L49 14Q57 17 57 25V50Q57 57 50 59L15 47Q10 45 10 38V13Q10 7 17 5Z','side',stroke='edge',strokeWidth=1),
    path('M14 9L46 18Q53 20 53 27V51Q53 57 47 55L15 46Q9 44 9 38V15Q9 8 14 9Z','front',stroke='rim',strokeWidth=1.5),
    path('M18 20L43 27M18 30L43 37M18 40L43 47','none',stroke='side',strokeWidth=4.5,strokeLinecap='round'),
    rim('M18 18L43 25M18 28L43 35M18 38L43 45',opacity=.75),
    shape('ellipse',cx=36,cy=24.5,rx=4.4,ry=5,fill='peach',stroke='rim',strokeWidth=1),
    shape('ellipse',cx=24,cy=31.3,rx=4.4,ry=5,fill='peach',stroke='rim',strokeWidth=1),
    shape('ellipse',cx=38,cy=45,rx=4.4,ry=5,fill='peach',stroke='rim',strokeWidth=1),
]
art['bell'] = [
    path('M29 15V11Q29 5 35 7Q41 9 40 17','side',stroke='edge',strokeWidth=1.2),
    path('M26 15V10Q26 5 31 6Q36 7 36 14','front',stroke='rim',strokeWidth=1.3),
    path('M18 45Q23 39 23 29Q23 14 36 15Q49 16 50 31Q50 42 56 48Q58 52 52 55L19 50Z','side',stroke='edge',strokeWidth=1),
    shape('ellipse',cx=32,cy=50,rx=6.2,ry=7.5,fill='peach',stroke='rim',strokeWidth=1.1),
    path('M10 43Q16 37 17 26Q18 12 31 14Q44 16 44 30Q45 42 51 48Q53 51 49 52L12 48Q7 47 10 43Z','front',stroke='rim',strokeWidth=1.6),
    path('M11 44Q28 39 49 48Q52 49 48 51Q27 46 11 48Z','top',stroke='rim',strokeWidth=1),
    rim('M20 24Q21 15 30 17',opacity=.72),
]
art['volume'] = [
    path('M35 11Q38 8 42 12V53Q42 59 37 57L18 41L8 38V26L18 23Z','side',stroke='edge',strokeWidth=1.1),
    path('M8 26L18 29L36 14Q38 12 38 17V54Q38 58 35 55L18 41L8 38Z','front',stroke='rim',strokeWidth=1.5),
    path('M8 26L18 29V41L8 38Z','top',stroke='rim',strokeWidth=1.2),
    path('M47 24Q58 34 48 45M53 16Q69 34 54 53','none',stroke='side',strokeWidth=5,strokeLinecap='round'),
    path('M45 23Q55 33 46 44M51 16Q66 33 52 51','none',stroke='front',strokeWidth=4.2,strokeLinecap='round'),
    path('M45 22Q54 31 48 41M51 15Q64 29 58 42','none',stroke='rim',strokeWidth=1,strokeLinecap='round'),
]
art['bookmark'] = [
    path('M19 5L45 12Q51 14 51 20V54Q51 60 46 58L33 45L21 50Q15 53 15 47V12Q15 7 19 5Z','side',stroke='edge',strokeWidth=1),
    path('M17 9L41 16Q47 17 47 23V54Q47 58 43 54L30 42L18 48Q13 51 13 46V14Q13 8 17 9Z','front',stroke='rim',strokeWidth=1.6),
    rim('M18 12L40 18Q43 19 44 22',opacity=.78),
]
art['sparkles'] = [
    path('M32 9Q37 27 49 31Q57 34 49 37Q37 41 32 56Q30 61 27 55Q22 42 10 38Q5 35 10 32Q24 28 28 12Q30 5 32 9Z','side',transform='translate(3 1)'),
    path('M31 8Q35 24 47 29Q54 32 47 35Q35 39 31 53Q29 59 26 53Q22 39 10 35Q4 32 10 29Q23 25 26 11Q28 3 31 8Z','front',stroke='rim',strokeWidth=1.5),
    path('M28 14Q27 29 12 32Q28 34 29 49Q31 35 44 32Q32 28 28 14Z','peach',opacity=.4),
    path('M51 7Q53 14 58 16Q61 17 58 18Q53 20 51 27Q49 20 44 18Q41 17 44 16Q49 14 51 7Z','top',stroke='rim',strokeWidth=1),
    path('M52 43Q54 49 59 51Q54 53 52 59Q50 53 45 51Q50 49 52 43Z','peach',stroke='rim',strokeWidth=1),
]
art['activity'] = cube(5,40,14,11) + cube(24,28,14,26,True) + cube(43,11,14,45)
art['code'] = [
    path('M22 15L9 28Q6 31 9 35L22 49Q25 52 28 49Q31 46 28 43L18 32L28 22Q31 18 28 15Q25 12 22 15Z','side',transform='translate(2 -1)'),
    path('M20 16L7 29Q4 32 7 36L20 50Q23 53 26 50Q29 47 26 44L16 33L26 23Q29 19 26 16Q23 13 20 16Z','front',stroke='rim',strokeWidth=1.4),
    path('M45 15L58 29Q61 32 58 36L45 50Q42 53 39 50Q36 47 39 44L49 33L39 23Q36 19 39 16Q42 13 45 15Z','side',transform='translate(2 -1)'),
    path('M43 16L56 30Q59 33 56 37L43 51Q40 54 37 51Q34 48 37 45L47 34L37 24Q34 20 37 17Q40 14 43 16Z','front',stroke='rim',strokeWidth=1.4),
    path('M34 10Q35 5 39 6Q43 7 42 12L32 54Q31 59 27 58Q23 57 24 52Z','peach',stroke='rim',strokeWidth=1.4),
]
art['copy'] = [
    path('M31 7L46 11L58 25V49Q58 54 53 53L30 47Q26 46 26 41V12Q26 6 31 7Z','side',stroke='edge',strokeWidth=1),
    path('M29 10L43 14L54 27V48Q54 52 50 51L28 45Q24 44 24 40V15Q24 9 29 10Z','front',stroke='rim',strokeWidth=1.3),
    path('M43 14V23Q43 26 47 27L54 28Z','top',stroke='rim',strokeWidth=1),
    path('M15 22L30 26L44 41V57Q44 62 38 60L13 53Q9 52 9 47V27Q9 21 15 22Z','side',transform='translate(3 -2)'),
    path('M13 24L28 28L41 42V56Q41 60 37 59L13 52Q9 51 9 47V29Q9 23 13 24Z','front',stroke='rim',strokeWidth=1.5),
    path('M28 28V37Q28 40 32 41L41 43Z','top',stroke='rim',strokeWidth=1),
    rim('M15 44L30 48',opacity=.8),
]
art['inbox'] = [
    path('M8 31L37 17Q40 16 43 18L57 27L57 50Q57 53 53 55L29 62L8 48Z','side',stroke='edge',strokeWidth=1),
    path('M10 31L38 19L53 28L28 42Z','top',stroke='rim',strokeWidth=1.3),
    path('M24 7Q24 3 28 4L48 10Q52 11 51 15L47 40L22 34Z','peach',stroke='rim',strokeWidth=1.4),
    path('M29 13L43 17M28 20L42 24M27 27L39 31','none',stroke='#fff0dc',strokeWidth=2,strokeLinecap='round',opacity=.85),
    path('M8 31L20 37Q23 38 24 42Q27 46 31 43L35 39L55 29V49Q55 53 51 54L30 60Q27 61 24 59L11 50Q8 48 8 44Z','front',stroke='rim',strokeWidth=1.5),
    rim('M11 33L20 38Q23 39 24 42Q27 47 32 44L35 40L52 31'),
]

lines = {
    'layers': ['M12 3 3 8l9 5 9-5-9-5Z','m3 12 9 5 9-5','m3 16 9 5 9-5'],
    'folder': ['M3 7V6a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z'],
    'grid': ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
    'settings': ['M4 6h16M4 12h16M4 18h16','M9 3v6M15 9v6M8 15v6'],
    'bell': ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9','M10 21h4'],
    'volume': ['M11 4 6 8H3v8h3l5 4V4Z','M15 8a6 6 0 0 1 0 8','M18 5a10 10 0 0 1 0 14'],
    'bookmark': ['M6 3h12v18l-6-4-6 4V3Z'],
    'sparkles': ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z','M20 2v4M18 4h4'],
    'activity': ['M4 20v-5M12 20V9M20 20V3'],
    'code': ['m7 5-6 7 6 7','m17 5 6 7-6 7','m14 3-4 18'],
    'copy': ['M9 9h12v12H9z','M15 5V3H3v12h2'],
    'inbox': ['M4 4h16l2 11v5H2v-5L4 4Z','M2 15h6l2 3h4l2-3h6'],
    'plus': ['M12 5v14M5 12h14'],
    'check': ['m5 12 4 4L19 6'],
    'search': ['M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z','m15 15 6 6'],
    'more': ['M5 12h.01M12 12h.01M19 12h.01'],
    'reset': ['M3 10a9 9 0 1 1 1.5 7','M3 4v6h6'],
}

gradients = {
    'front': {'x1': '10%', 'y1': '0%', 'x2': '75%', 'y2': '100%', 'stops': [('0%','#effbff'),('26%','#b9dce8'),('68%','#5aafbf'),('100%','#b6f1e8')]},
    'side': {'x1': '0%', 'y1': '0%', 'x2': '100%', 'y2': '85%', 'stops': [('0%','#7ab5ca'),('50%','#2e7595'),('100%','#5aaeb7')]},
    'top': {'x1': '15%', 'y1': '0%', 'x2': '80%', 'y2': '100%', 'stops': [('0%','#f9feff'),('45%','#bfdde7'),('100%','#84d7d6')]},
    'peach': {'x1': '10%', 'y1': '0%', 'x2': '90%', 'y2': '100%', 'stops': [('0%','#fff4df'),('45%','#ffd1ad'),('100%','#e99d82')]},
    'peachSide': {'x1': '0%', 'y1': '0%', 'x2': '100%', 'y2': '100%', 'stops': [('0%','#f6c6ac'),('100%','#c98870')]},
    'rim': {'x1': '0%', 'y1': '0%', 'x2': '80%', 'y2': '100%', 'stops': [('0%','#ffffff'),('42%','#f4ffff'),('100%','#9ed9df')]},
    'edge': {'x1': '0%', 'y1': '0%', 'x2': '100%', 'y2': '100%', 'stops': [('0%','#d9eef9'),('100%','#528ca1')]},
}

header = '''import { createElement, useId, type CSSProperties } from "react";
import { useLiquidAppearance } from "./appearance";

/** Original vector redraws of the generated Quantive Glass art direction.
 * Shapes remain ordinary decorative SVG above the shared WebGPU material. */
'''
body = '\nconst artwork = {\n' + ''.join('  '+json.dumps(name)+': [\n'+''.join('    '+json.dumps(item, separators=(',', ':'))+',\n' for item in shapes)+'  ],\n' for name,shapes in art.items()) + '} as const;\n'
body += '\nconst linePaths = {\n' + ''.join('  '+json.dumps(name)+': '+json.dumps(paths, separators=(',', ':'))+',\n' for name,paths in lines.items()) + '} as const;\n'
body += '\nconst gradients = {\n' + ''.join('  '+json.dumps(name)+': '+json.dumps(value, separators=(',', ':'))+',\n' for name,value in gradients.items()) + '} as const;\n'
footer = '''
export type LiquidIconName = keyof typeof linePaths;
export const LIQUID_ICON_NAMES = Object.keys(linePaths) as LiquidIconName[];
export const LIQUID_ISOMETRIC_ICON_NAMES = Object.keys(artwork) as (keyof typeof artwork)[];
export type LiquidIconProps = {
  name: LiquidIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

type Shape = { tag: string; props: Record<string, string | number> };
const paint = (value: string | number, prefix: string) =>
  typeof value === "string" && value in gradients ? `url(#${prefix}-${value})` : value;

/** Decorative only: name the containing control or provide adjacent text. */
export function LiquidIcon({ name, size = 24, className = "", style }: LiquidIconProps) {
  const { iconSet } = useLiquidAppearance();
  const prefix = `qg-icon-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const object = name in artwork ? artwork[name as keyof typeof artwork] : undefined;
  const variant = iconSet === "isometric" && object && size >= 20 ? "isometric" : "line";
  return (
    <span
      className={`qg-icon ${className}`.trim()}
      data-liquid-icon={name}
      data-liquid-icon-set={iconSet}
      data-icon-style={variant}
      aria-hidden="true"
      style={{ width: size, height: size, ...style }}
    >
      {object && (
        <svg className="qg-icon-object" data-icon-variant="isometric" viewBox="0 0 64 64" fill="none" focusable="false" aria-hidden="true">
          <defs>
            {Object.entries(gradients).map(([key, gradient]) => (
              <linearGradient key={key} id={`${prefix}-${key}`} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
                {gradient.stops.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />)}
              </linearGradient>
            ))}
          </defs>
          {(object as readonly Shape[]).map(({ tag, props }, index) => createElement(tag, {
            ...props,
            key: index,
            fill: paint(props.fill ?? "none", prefix),
            stroke: paint(props.stroke ?? "none", prefix),
            strokeLinejoin: "round",
          }))}
        </svg>
      )}
      <svg className="qg-icon-line" data-icon-variant="line" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 3 : 1.7} strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
        {linePaths[name].map((d) => <path key={d} d={d} />)}
      </svg>
    </span>
  );
}
'''
(ROOT/'src/icons.tsx').write_text(header+body+footer)

def xml_attrs(attrs, prefix):
    out=[]
    for key,value in attrs.items():
        attr=''.join('-'+c.lower() if c.isupper() else c for c in key)
        if key in ['fill','stroke'] and value in gradients: value=f'url(#{prefix}-{value})'
        out.append(f'{attr}="{escape(str(value),quote=True)}"')
    return ' '.join(out)

def defs(prefix):
    chunks=['<defs>']
    for key, g in gradients.items():
        chunks.append(f'<linearGradient id="{prefix}-{key}" x1="{g["x1"]}" y1="{g["y1"]}" x2="{g["x2"]}" y2="{g["y2"]}">')
        chunks += [f'<stop offset="{o}" stop-color="{c}"/>' for o,c in g['stops']]
        chunks.append('</linearGradient>')
    return ''.join(chunks)+'</defs>'

for name, paths in lines.items():
    line='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+('3' if name=='more' else '1.7')+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+''.join(f'<path d="{escape(d)}"/>' for d in paths)+'</svg>\n'
    (ROOT/'assets/icons/line'/f'{name}.svg').write_text(line)

for name, shapes in art.items():
    prefix='qgi-'+name
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke-linejoin="round" aria-hidden="true">'+defs(prefix)
    svg+=''.join(f'<{s["tag"]} {xml_attrs(s["props"],prefix)}/>' for s in shapes)+'</svg>\n'
    (ROOT/'assets/icons'/f'{name}.svg').write_text(svg)

# A vector-only review sheet: production shapes at both navigation and card sizes.
sheet=['<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="840" viewBox="0 0 1080 840"><defs><linearGradient id="scene" x2="1" y2="1"><stop stop-color="#e7f4fa"/><stop offset="1" stop-color="#c2e0e7"/></linearGradient></defs><rect width="1080" height="840" fill="url(#scene)"/><path d="M0 610Q270 520 520 210T1080 100V840H0Z" fill="#93c5cf"/><text x="48" y="60" font-family="sans-serif" font-size="26" fill="#193e54">Quantive Glass · original SVG icon family</text>']
for i,(name,shapes) in enumerate(art.items()):
    x=48+(i%4)*258; y=100+(i//4)*226
    prefix='sheet-'+name
    sheet.append(f'<rect x="{x}" y="{y}" width="228" height="196" rx="24" fill="#fff" fill-opacity=".35" stroke="#fff" stroke-width="1.5"/>')
    sheet.append(f'<svg x="{x+28}" y="{y+25}" width="96" height="96" viewBox="0 0 64 64">'+defs(prefix)+''.join(f'<{s["tag"]} {xml_attrs(s["props"],prefix)}/>' for s in shapes)+'</svg>')
    sheet.append(f'<svg x="{x+142}" y="{y+55}" width="36" height="36" viewBox="0 0 64 64">'+''.join(f'<{s["tag"]} {xml_attrs(s["props"],prefix)}/>' for s in shapes)+'</svg>')
    sheet.append(f'<svg x="{x+190}" y="{y+62}" width="24" height="24" viewBox="0 0 64 64">'+''.join(f'<{s["tag"]} {xml_attrs(s["props"],prefix)}/>' for s in shapes)+'</svg>')
    sheet.append(f'<text x="{x+24}" y="{y+158}" font-family="sans-serif" font-size="17" fill="#193e54">{name}</text>')
sheet.append('<text x="48" y="810" font-family="sans-serif" font-size="14" fill="#31596b">Vector faces, polished rims, warm accents. Line variants remain available for dense UI and forced colours.</text></svg>')
(ROOT/'assets/icon-reference/vector-review.svg').write_text(''.join(sheet))
print('Wrote',len(art),'object SVGs and',len(lines),'line SVGs plus React renderer')
