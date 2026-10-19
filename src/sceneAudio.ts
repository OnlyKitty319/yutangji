import type {Campaign} from './campaign';
import type {MusicMood} from './dialogueAudio';
// 氛围只读取当前游戏状态，绝不修改随机数、费用、疾病或结算。
export function musicForScene(g:Campaign,scene:string,speaker:string):MusicMood {
 if(g.phase==='ended')return g.result?.outcome==='cancelled'?'evening':g.result?.success?'success':'loss';
 if(g.health?.pending||g.health?.episode?.stage==='active'||g.laboratory?.decisionPending)return 'disease';
 if(scene.includes('rain')||g.pending==='weather')return 'rain';
 if(speaker==='zhou'||scene.includes('market')||scene.includes('harvest'))return 'market';
 if(scene.includes('evening')||scene.includes('night')||speaker==='lin')return 'evening';
 return 'pond';
}
export function narrationForScene(scene:string){
 if(/health|disease|dead|wssv|ahpnd/.test(scene))return '塘边安静了下来。我攥着记录本，听见远处水车还在转。';
 if(/lab|report|test/.test(scene))return '桌上摊开了新的记录。我把样品放好，拉过一张椅子坐下。';
 if(/rain|storm|power/.test(scene))return '风越过塘埂，卷起了水面的细浪。我把衣领拉紧，向机房走去。';
 if(/family/.test(scene))return '屋里亮着暖黄的灯，饭菜还冒着热气。我在桌边坐了下来。';
 if(/evening|night/.test(scene))return '天色暗了，塘屋的灯亮起来。我听着水声，把白天的记录摊在桌上。';
 if(/ending|harvest|closure/.test(scene))return '岸边堆着收起的网。我合上账本，回头看了看这口塘。';
 if(/feed|supply|store|market|sell/.test(scene))return '我推开料棚的门，空气里有淡淡的饲料味。有人在门口叫住了我。';
 if(/equipment|repair|maintain/.test(scene))return '机房里传来工具碰撞的声音。我绕过电缆，停在检修台旁边。';
 if(/preparation|drain|bottom/.test(scene))return '我沿着塘底留下的水痕往前走。鞋底沾了泥，远处有人朝我招手。';
 if(/stock/.test(scene))return '水面映着天光。我蹲在塘边，看着新放下去的虾苗慢慢散开。';
 return '我走回熟悉的塘埂。风吹过水面，岸边的脚步声越来越近。';
}
