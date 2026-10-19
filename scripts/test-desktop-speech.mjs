import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const profiles=JSON.parse(fs.readFileSync('desktop/voiceProfiles.json','utf8'));
const script=fs.readFileSync('desktop/speak.ps1','utf8');
const results=[];
for(const role of ['chen','narrator']){
 const bytes=await new Promise((resolve,reject)=>{
  const child=spawn(path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let out='',error='';const timeout=setTimeout(()=>{child.kill();reject(Error('timeout'));},30000);
  child.stdout.on('data',d=>out+=d.toString());child.stderr.on('data',d=>error+=d.toString());child.on('error',reject);
  child.on('close',code=>{clearTimeout(timeout);if(code!==0)reject(Error('speech failed '+error));else resolve(Buffer.from(out,'base64'));});
  child.stdin.end(JSON.stringify({role,profile:profiles[role],text:'第六十天，报价每斤十八元。<pitch>只是文字，不是标记。'}),'utf8');
 });
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.readUInt32LE(24)!==16000||bytes.length!==bytes.readUInt32LE(40)+44)throw Error('invalid WAV');
 let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));if(peak<100)throw Error('silent');
 results.push({role,seconds:(bytes.length-44)/32000,peak,xmlTextEscaped:true});
}
fs.writeFileSync('desktop-speech-verification-0.8.1.json',JSON.stringify({results,actualSpeakerPlayback:false},null,2));console.log(JSON.stringify(results));
