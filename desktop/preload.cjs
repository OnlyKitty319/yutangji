const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('yutangjiVoice',{
 speak:(text,role)=>ipcRenderer.invoke('dialogue:speak',text,role),
 cancel:()=>ipcRenderer.send('dialogue:cancel'),
});
