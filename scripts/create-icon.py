"""绘制与游戏塘水配色一致的原创图标；可重新运行生成 ICO。"""
from PIL import Image, ImageDraw
from pathlib import Path
root = Path(__file__).resolve().parent.parent
im = Image.new('RGBA', (256,256), (0,0,0,0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((8,8,248,248), radius=52, fill='#245b49')
d.rounded_rectangle((30,38,226,218), radius=38, fill='#c4c598')
d.rounded_rectangle((41,50,215,206), radius=29, fill='#438775')
for y in [90,128,166]:
    for x in [56,100,144]:
        d.arc((x,y-12,x+44,y+12),0,180,fill='#cde3ca',width=5)
d.line((76,69,150,69),fill='#f4e6b7',width=8)
for x in [94,113,132]: d.line((x,57,x,80),fill='#f4e6b7',width=6)
im.save(root/'desktop'/'icon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
im.save(root/'public'/'icon.png')
