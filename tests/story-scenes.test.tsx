import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {newCampaign,dispatchCampaign,type Campaign} from '../src/campaign';
import {selectScene,SCENES} from '../src/storyScenes';
import {decodeCampaign,encodeCampaign,emptyProfile} from '../src/campaignStorage';
import {StoryHome,StoryScene} from '../src/StoryExperience';
const no=()=>{};
const props=(g:Campaign)=>({g,disabled:false,onAction:async()=>true,onRestart:no,onExport:no,onHome:no,onSave:no});
describe('叙事场景切换与界面内容',()=>{
  it('整备、进水与放苗前使用对应场景，不按说话人任意换景',()=>{const g=newCampaign();expect(selectScene(g)).toBe('pond-preparation');expect(selectScene({...g,prepIndex:5})).toBe('pond-dawn');expect(selectScene({...g,prepIndex:9})).toBe('pond-stocking');expect(selectScene(g,{conversation:'arrival'})).toBe('pond-dawn');});
  it('天气预警及天气窗口优先于日常；结束后恢复常规场景',()=>{const g={...newCampaign(),phase:'growing' as const,stockingDay:25,day:57,weatherDay:57};expect(selectScene({...g,pending:'weather'})).toBe('pond-rain');expect(selectScene(g)).toBe('pond-rain');expect(selectScene({...g,day:59})).toBe('pond-rain');expect(selectScene({...g,day:60})).not.toBe('pond-rain');});
  it('只有兑现家庭赴约才进入饭桌，没有兑现仍在塘边',()=>{const g={...newCampaign(),phase:'growing' as const,stockingDay:25,day:80};expect(selectScene(g,{conversation:'family-after'})).toBe('pond-evening');const done={id:'family',day:70,kind:'relief' as const,done:true};expect(selectScene({...g,delayed:[done]},{conversation:'family-after'})).toBe('family-table');expect(selectScene({...g,delayed:[{...done,done:false}]},{conversation:'family-after'})).toBe('pond-evening');expect(selectScene({...g,delayed:[{...done,kind:'explain'}]},{conversation:'family-after'})).toBe('pond-evening');});
  it('准备期止损不能展示虚构收获；有销售结算才展示收网',()=>{const g=dispatchCampaign(newCampaign(),{type:'stop'},'stop');expect(selectScene(g)).toBe('pond-evening');expect(selectScene({...g,result:{...g.result!,kind:'sale'}})).toBe('scene-100');});
  it('恢复存档能还原对应场景，不需要额外写入背景数据',()=>{let g=dispatchCampaign(newCampaign(),{type:'register',name:'小满',gender:'female'},'reg');g=dispatchCampaign(g,{type:'talk',conversation:'arrival',answer:'home'},'talk');const back=decodeCampaign(encodeCampaign({game:g,profile:emptyProfile()})).game;expect(selectScene(back)).toBe(selectScene(g));expect(Object.keys(SCENES)).toHaveLength(112);});
  it('未注册页面提供男女角色、姓名和本地注册说明',()=>{const html=renderToStaticMarkup(<StoryHome {...props(newCampaign())} onContinue={no}/>);expect(html).toContain('男性初始角色');expect(html).toContain('女性初始角色');expect(html).toContain('player-name');expect(html).toContain('注册角色，接过钥匙');expect(html).toContain('无需手机号或密码');});
  it('开场渲染三个真实分支和明确说话人，不暴露未注册经营入口',()=>{const g=dispatchCampaign(newCampaign(),{type:'register',name:'小满',gender:'male'},'reg');const html=renderToStaticMarkup(<StoryScene {...props(g)}/>);expect(html).toContain('陈伯');expect(html).toContain('钥匙给你');expect(html).not.toContain('scene-copy');expect((html.match(/class="dialogue-choice"/g)||[]).length).toBe(3);expect(html).toContain('pond-dawn.webp');expect(html).not.toContain('story-hud');});
});
