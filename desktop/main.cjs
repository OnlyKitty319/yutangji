const {app,BrowserWindow,protocol,net,Menu,dialog,session,ipcMain}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');

// 固定来源和用户目录：更新/移动程序不会另建存档，测试使用独立目录。
app.setName('渔塘记');
app.setPath('userData',process.env.YUTANGJI_TEST_DATA||path.join(app.getPath('appData'),'Yutangji-Earthen-120'));
protocol.registerSchemesAsPrivileged([{scheme:'yutangji',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let mainWindow,voiceProcess;
const {spawn}=require('node:child_process');
const cancelVoice=()=>{if(voiceProcess){voiceProcess.kill();voiceProcess=undefined;}};
const validVoiceSender=event=>event.sender===mainWindow?.webContents&&event.senderFrame===mainWindow.webContents.mainFrame&&event.senderFrame.url.startsWith('yutangji://game/');
ipcMain.on('dialogue:cancel',event=>{if(validVoiceSender(event))cancelVoice();});
ipcMain.handle('dialogue:speak',async(event,text,role)=>{
 if(!validVoiceSender(event)||typeof text!=='string'||text.length>2000||!['chen','lan','ze','lin','zhou','male','female','narrator'].includes(role))return false;
 cancelVoice();
 return new Promise(resolve=>{
  const script=fs.readFileSync(path.join(__dirname,'speak.ps1'),'utf8');
  const child=spawn(path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','ignore']});voiceProcess=child;
  let encoded='',tooLarge=false;child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{if(tooLarge)return;encoded+=chunk;if(encoded.length>16000000){tooLarge=true;encoded='';child.kill();}});
  const timer=setTimeout(()=>child.kill(),120000);
  const done=code=>{clearTimeout(timer);if(voiceProcess===child)voiceProcess=undefined;resolve(code===0&&!tooLarge&&encoded.startsWith('UklGR')?'data:audio/wav;base64,'+encoded:false);};
  child.on('error',()=>done(-1));child.on('close',done);child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({text,role,profile:require('./voiceProfiles.json')[role]}),'utf8');
 });
});
app.on('before-quit',cancelVoice);
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
  app.whenReady().then(async()=>{
    const root=path.join(app.getAppPath(),'dist');
    if(!fs.existsSync(path.join(root,'index.html')))throw Error('缺少游戏资源，请完整解压分享包，不要只复制EXE。');
    protocol.handle('yutangji',async request=>{
      try{
        const url=new URL(request.url);
        if(url.host!=='game'||!['GET','HEAD'].includes(request.method))return new Response('Not found',{status:404});
        const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
        const relative=path.relative(root,filename);
        if(!relative||relative.startsWith('..')||path.isAbsolute(relative))return new Response('Forbidden',{status:403});
        return await net.fetch(pathToFileURL(filename).toString());
      }catch{return new Response('资源未能加载，请重新完整解压游戏。',{status:404});}
    });
    session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'游戏',submenu:[{label:'退出游戏',role:'quit'}]},
      {label:'显示',submenu:[{label:'放大',role:'zoomIn'},{label:'缩小',role:'zoomOut'},{label:'恢复默认大小',role:'resetZoom'},{type:'separator'},{label:'全屏',role:'togglefullscreen'}]},
      {label:'帮助',submenu:[{label:'关于与存档位置',click:()=>dialog.showMessageBox(mainWindow,{type:'info',title:'渔塘记 · 土塘120天',message:'渔塘记 · 1.0试用版',detail:'进度自动保存在本机用户目录。请在游戏“存档”页导出文件做额外备份。\n\n'+app.getPath('userData')+'\n\n桌面版与网页版不会自动同步。'})}]}
    ]));
    mainWindow=new BrowserWindow({width:1280,height:850,minWidth:760,minHeight:600,show:false,title:'渔塘记 · 土塘120天',backgroundColor:'#f5f6ec',icon:path.join(__dirname,'icon.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
    mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('yutangji://game/'))event.preventDefault();});
    mainWindow.webContents.on('will-prevent-unload',event=>{
      const choice=dialog.showMessageBoxSync(mainWindow,{type:'warning',buttons:['留在游戏','仍然退出'],defaultId:0,cancelId:0,title:'进度尚未保存',message:'还有正在保存或保存失败的进度。',detail:'建议留在游戏，等保存完成，或从“存档”页导出文件后再退出。'});
      if(choice===1)event.preventDefault();
    });
    session.defaultSession.on('will-download',(_event,item)=>{item.setSaveDialogOptions({title:'导出渔塘记存档',defaultPath:path.join(app.getPath('documents'),item.getFilename())});});
    mainWindow.once('ready-to-show',()=>mainWindow.show());
    await mainWindow.loadURL('yutangji://game/index.html');
  }).catch(error=>{dialog.showErrorBox('渔塘记未能启动',error.message);app.quit();});
}
app.on('window-all-closed',()=>app.quit());
