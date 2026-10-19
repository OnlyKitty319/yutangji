"""保留PNG原图，为游戏生成同尺寸WebP；只处理public/story，不覆盖业务文件。"""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent.parent
rows=[]
for source in sorted((root/'public/story').glob('*.png')):
 target=source.with_suffix('.webp')
 with Image.open(source) as original:
  if not target.exists() or target.stat().st_mtime<source.stat().st_mtime:
   original.save(target,'WEBP',quality=86,method=4)
  with Image.open(target) as compact:
   compact.load();assert compact.size==original.size
  rows.append({'file':source.stem,'width':original.width,'height':original.height,'originalBytes':source.stat().st_size,'webBytes':target.stat().st_size})
report={'images':len(rows),'originalBytes':sum(x['originalBytes'] for x in rows),'webBytes':sum(x['webBytes'] for x in rows),'sameDimensions':True,'files':rows}
(root/'scene-optimization.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='files'}),flush=True)
