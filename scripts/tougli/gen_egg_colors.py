# Couleur dominante (saturée) de chaque œuf : public/dofus/*.webp -> src/data/egg-colors.ts
import colorsys, json, os, sys
from PIL import Image
D, OUT = sys.argv[1], sys.argv[2]
res = {}
for f in sorted(os.listdir(D)):
    if not f.endswith('.webp'): continue
    im = Image.open(os.path.join(D, f)).convert('RGBA').resize((48, 48))
    buckets = {}
    for r, g, b, a in im.get_flattened_data():
        if a < 200: continue
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if l < .12 or l > .9: continue
        k = round(h * 24) % 24
        w = s * (1 - abs(l - .5) * 1.2)
        acc = buckets.setdefault(k, [0, 0, 0, 0])
        acc[0] += r * w; acc[1] += g * w; acc[2] += b * w; acc[3] += w
    if not buckets: res[f] = '#c8283c'; continue
    k = max(buckets, key=lambda k: buckets[k][3]); r, g, b, w = buckets[k]
    r, g, b = r / w, g / w, b / w
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if s < .18: l, s = min(max(l, .45), .6), s  # œufs gris / blancs : on garde le gris
    else: l, s = .5, max(s, .55)
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    res[f] = '#%02x%02x%02x' % (int(r * 255), int(g * 255), int(b * 255))
# Œufs noirs / blancs / argentés : la teinte dominante trompe, on fixe à la main.
res.update({'ebene.webp': '#8a6a3a', 'domakuro.webp': '#5a5866', 'dorigami.webp': '#d4a99a', 'dofus-argente.webp': '#9aa6b2', 'dofus-argente-scintillant.webp': '#c9b26a', 'ivoire.webp': '#d6c08a'})
with open(OUT, 'w') as o:
    o.write('// GÉNÉRÉ par scripts/tougli/gen_egg_colors.py : couleur dominante de chaque image d’œuf.\n')
    o.write('export const eggColors: Record<string, string> = ' + json.dumps(res, indent=1) + ';\n')
print(res)
