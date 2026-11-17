/* TK1 - the tool tracking block on the Companion, run against a mock Apps Script */
const crypto=require('crypto'),fs=require('fs'),vm=require('vm'),path=require('path');
function Sheet(name){this.name=name;this.v=[];}
Sheet.prototype.getRange=function(r,c,nr,nc){const sh=this;if(typeof r==="string")return{setNumberFormat(){}};return{setValues(vals){for(let i=0;i<vals.length;i++){while(sh.v.length<r+i)sh.v.push([]);sh.v[r-1+i]=vals[i].slice();}return this},setFontWeight(){return this},clearContent(){for(let i=0;i<nr;i++)sh.v[r-1+i]=[];}}};
Sheet.prototype.getDataRange=function(){const sh=this;return{getValues(){return sh.v.filter((row,i)=>i===0||row.some(x=>x!==""&&x!=null)).map(r=>r.slice());}}};
Sheet.prototype.appendRow=function(a){this.v=this.v.filter((row,i)=>i===0||row.some(x=>x!==""&&x!=null));this.v.push(a.slice());};Sheet.prototype.setFrozenRows=function(){};Sheet.prototype.getLastRow=function(){return this.v.length;};
const SS={sheets:{},getSheetByName(n){return this.sheets[n]||null},insertSheet(n){return this.sheets[n]=new Sheet(n)},getSheets(){return Object.values(this.sheets)},deleteSheet(){},getId(){return "SSID"},getUrl(){return "u"}};
const props={},cache={};let fetches=0;
const STAFF={"Mukesh Verma":["9999","admin"],"Gautam":["1111","accounts"],"Jaiprakash":["2222","godown"],"Vivek":["3333","sales"]};
const ctx={JSON,Math,Date,String,Number,Array,Object,Error,
 SpreadsheetApp:{create(){return SS},openById(){return SS}},
 PropertiesService:{getScriptProperties(){return{getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v}}},
 CacheService:{getScriptCache(){return{get:k=>cache[k]||null,put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]}}},
 LockService:{getScriptLock(){return{waitLock(){},releaseLock(){}}}},
 Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest(a,s){return [...crypto.createHash('sha256').update(s).digest()].map(b=>b>127?b-256:b)},
   base64Decode(s){return [...Buffer.from(s,'base64')]},base64EncodeWebSafe(a){return Buffer.from(a.map(b=>(b+256)%256)).toString('base64url')},newBlob(b,t,n){return{b,t,n}},formatDate(){return "x"}},
 DriveApp:{getFoldersByName(){return{hasNext(){return false}}},createFolder(){return{createFile(){return{setDescription(){},getUrl(){return "u"}}}}}},
 UrlFetchApp:{fetch(url,o){fetches++;const p=JSON.parse(o.payload);const s=STAFF[p.user];const ok=s&&(p.pin===s[0]||p.tok==="tok-"+p.user);return{getContentText(){return JSON.stringify(ok?{ok:true,user:{name:p.user,role:s[1]}}:{ok:false})}}}},
 ContentService:{MimeType:{JSON:1},createTextOutput(s){return{s,setMimeType(){return this}}}},
 coCrmStaff_(b){const s=STAFF[b.crmUser];return s&&b.crmPin===s[0]?{ok:true,name:b.crmUser}:{ok:false}},
 coAuth_(b){return b.mobile==="9000000001"&&b.pin==="4321"?{ok:true,refId:"AS-7",name:"Ramesh Plumber"}:{ok:false}}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','server','bx_companion.gs'),'utf8')+"\n"+fs.readFileSync(path.join(__dirname,'..','server','tk_companion.gs'),'utf8'),ctx);
const call=b=>{const r=ctx.tkTry_({postData:{contents:JSON.stringify(b)}});return r?JSON.parse(r.s):null;};
let pass=0,fail=0;const ok=(m,c)=>{if(c){pass++;console.log("  ok   ",m)}else{fail++;console.log("  FAIL ",m)}};
ctx.bxSetup();
const as=(u,extra)=>Object.assign({action:"tkStaff",crmUser:u,crmPin:STAFF[u][0]},extra);
ok("not ours: another action is left to the Companion", call({action:"login"})===null && call({action:"bxPing"})===null);
ok("ping", call({action:"tkPing"}).v==="TK1");
ok("a wrong PIN is signed out", call({action:"tkStaff",crmUser:"Vivek",crmPin:"0000",op:"book"}).out===1);
ok("the saved CRM token signs in too", call({action:"tkStaff",crmUser:"Vivek",crmTok:"tok-Vivek",op:"book"}).ok===true);
ok("godown cannot add to the tool list", call(as("Jaiprakash",{op:"toolAdd",name:"Punching machine"})).ok===false);
let r=call(as("Mukesh Verma",{op:"toolAdd",name:"Pipe punching machine",make:"Huliot",value:45000,count:3}));
ok("the owner adds 3 pieces: three tools, numbered fresh, not traced", r.ok&&r.tools.length===3&&r.tools.map(t=>t.code).join()==="EWT-001,EWT-002,EWT-003"&&r.tools.every(t=>t.hType==="unknown"));
const [A,B,C]=r.tools;
r=call(as("Gautam",{op:"toolAdd",name:"Welding machine 160",count:1,serial:"SN9",inGodown:1}));
ok("accounts adds one more, in the godown, the numbering goes on", r.ok&&r.tools[0].code==="EWT-004"&&r.tools[0].hType==="godown");
const D=r.tools[0];
r=call(as("Jaiprakash",{op:"move",tids:[A.tid,B.tid],tType:"partner",tName:"Ramesh Plumber",tRef:"AS-7",tCode:"PL080",tSite:"Green Valley Villa"}));
ok("any staff registers where two tools are: an Opening line each", r.ok&&r.tools.length===2&&SS.sheets.TK_Moves.v.filter(x=>x[5]==="Opening").length===2);
ok("a partner needs a name picked", call(as("Vivek",{op:"move",tids:[C.tid],tType:"partner",tName:""})).ok===false);
r=call(as("Vivek",{op:"move",tids:[A.tid],tType:"site",tName:"Sector 12 site",tRef:"S9",note:"shifted"}));
ok("site to site: from Ramesh at Green Valley to the Sector 12 site, in one line", r.ok&&(()=>{const m=SS.sheets.TK_Moves.v.slice(-1)[0];return m[5]==="Handed over"&&m[7]==="Ramesh Plumber"&&m[9]==="Green Valley Villa"&&m[10]==="site"&&m[11]==="Sector 12 site"&&m[16]==="Vivek";})());
ok("moving it to where it already is does nothing", call(as("Vivek",{op:"move",tids:[A.tid],tType:"site",tName:"Sector 12 site"})).ok===false);
r=call(as("Jaiprakash",{op:"move",tids:[A.tid],tType:"godown"}));
ok("back to the godown", r.ok&&r.tools[0].hType==="godown"&&r.tools[0].site==="");
ok("damage needs a line of what happened", call(as("Vivek",{op:"event",tid:B.tid,kind:"Damaged",note:""})).ok===false);
r=call(as("Vivek",{op:"event",tid:B.tid,kind:"Damaged",note:"Motor burnt on site",amount:3500}));
ok("damaged: the site, the holder and the amount to recover are on the line", r.ok&&r.tool.cond==="Damaged"&&r.event.site==="Green Valley Villa"&&r.event.who==="Ramesh Plumber"&&r.event.whoRef==="AS-7"&&r.event.amount===3500);
const eid=r.event.eid;
ok("sales cannot mark it recovered", call(as("Vivek",{op:"recover",eid})).ok===false);
ok("accounts marks it recovered", call(as("Gautam",{op:"recover",eid})).recovered==="Y");
ok("repaired puts it back to OK", call(as("Jaiprakash",{op:"event",tid:B.tid,kind:"Repaired"})).tool.cond==="OK");
ok("only the owner or accounts scrap a tool", call(as("Vivek",{op:"event",tid:C.tid,kind:"Scrapped"})).ok===false);
r=call(as("Vivek",{op:"book"}));
ok("the book: 4 tools, every move and the damage line", r.ok&&r.tools.length===4&&r.moves.length===4&&r.events.length===2&&r.me.role==="sales");
ok("sales cannot push the directory", call(as("Vivek",{op:"dirSync",dir:{}})).ok===false);
const big={partners:Array.from({length:900},(_,i)=>({n:"Partner number "+i+" of Panipat district",c:"PL"+i,r:"Plumber",t:"Panipat",i:"AS-"+i})),sites:[{n:"Site A",cl:"Client A",i:"S1"}],staff:[{n:"Vivek",r:"sales"}]};
ok("the owner's CRM sends the directory, over as many cells as it needs", call(as("Mukesh Verma",{op:"dirSync",dir:big})).chars>45000);
ok("...and it reads back whole", call(as("Vivek",{op:"book",wantDir:1})).dir.partners.length===900);
r=call({action:"tkMine",mobile:"9000000001",pin:"4321"});
ok("Saathi: Ramesh sees the one tool still with him, and where", r.ok&&r.tools.length===1&&r.tools[0].code==="EWT-002"&&r.tools[0].site==="Green Valley Villa");
ok("Saathi: a wrong PIN sees nothing", call({action:"tkMine",mobile:"9000000001",pin:"0000"}).ok===false);
ok("Saathi: staff looking at Ramesh see the same", call({action:"tkMine",crmUser:"Vivek",crmPin:"3333",refId:"AS-7"}).tools.length===1);
ok("the owner takes a tool off the list; nothing is deleted", call(as("Mukesh Verma",{op:"toolOff",tid:C.tid,note:"entered twice"})).tool.off===1&&SS.sheets.TK_Tools.v.length===5);
ok("a tool off the list cannot be moved", call(as("Vivek",{op:"move",tids:[C.tid],tType:"godown"})).ok===false);
const f0=fetches;call(as("Vivek",{op:"book"}));call(as("Vivek",{op:"book"}));
ok("the CRM is asked who he is once in ten minutes, not on every tap", fetches===f0);
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
