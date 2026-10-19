// 静音或语音不可用时留出阅读时间；只切换对白，不执行任何经营动作。
export const readingDelay=(text:string)=>Math.min(18000,Math.max(2600,Array.from(text).length*150));
export function continueWhenVisible(callback:()=>void,delay:number){
 let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
 const cancel=()=>{stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',arm);};
 const arm=()=>{clearTimeout(timer);if(!stopped&&!document.hidden)timer=setTimeout(()=>{cancel();callback();},delay);};
 document.addEventListener('visibilitychange',arm);arm();return cancel;
}
