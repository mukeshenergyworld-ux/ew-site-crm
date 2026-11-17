const crypto=require('crypto'),fs=require('fs'),vm=require('vm');
function Sheet(name){this.name=name;this.v=[];}
Sheet.prototype.getRange=function(r,c,nr,nc){const sh=this;if(typeof r==="string")return{setNumberFormat(){}};return{setValues(vals){for(let i=0;i<vals.length;i++){while(sh.v.length<r+i)sh.v.push([]);sh.v[r-1+i]=vals[i].slice();}return this;},setFontWeight(){return this;},clearContent(){for(let i=0;i<nr;i++)sh.v[r-1+i]=Array(nc).fill("");}}};
Sheet.prototype.getDataRange=function(){const sh=this;return{getValues(){return sh.v.filter((row,i)=>i===0||row.some(x=>x!==""&&x!=null)).map(r=>r.slice());}}};
Sheet.prototype.appendRow=function(a){this.v.push(a.slice());};Sheet.prototype.setFrozenRows=function(){};Sheet.prototype.getLastRow=function(){return this.v.length;};
const SS={sheets:{},getSheetByName(n){return this.sheets[n]||null},insertSheet(n){return this.sheets[n]=new Sheet(n)},getSheets(){return Object.values(this.sheets)},deleteSheet(){},getId(){return "SSID"},getUrl(){return "url"}};
const props={},cache={};const files=[];
const ctx={JSON,Math,Date,String,Number,Array,Object,Error,
 SpreadsheetApp:{create(){return SS},openById(){return SS}},
 PropertiesService:{getScriptProperties(){return{getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v}}},
 CacheService:{getScriptCache(){return{get:k=>cache[k]||null,put:(k,v)=>cache[k]=v,remove:k=>delete cache[k]}}},
 LockService:{getScriptLock(){return{waitLock(){},releaseLock(){}}}},
 Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest(a,s){return [...crypto.createHash('sha256').update(s).digest()].map(b=>b>127?b-256:b)},
   base64Decode(s){return [...Buffer.from(s,'base64')]},base64EncodeWebSafe(a){return Buffer.from(a.map(b=>(b+256)%256)).toString('base64url')},newBlob(b,t,n){return{b,t,n}},formatDate(){return "20261117_1300"}},
 DriveApp:{getFoldersByName(){return{hasNext(){return false}}},createFolder(){return{createFile(bl){const f={url:"https://drive/"+bl.n,setDescription(){},getUrl(){return this.url}};files.push(bl);return f;}}}},
 UrlFetchApp:{fetch(url,o){const p=JSON.parse(o.payload);const ok=p.user==="Mukesh Verma"&&p.pin==="9999";return{getContentText(){return JSON.stringify(ok?{ok:true,user:{role:"admin"}}:{ok:false})}}}},
 ContentService:{MimeType:{JSON:1},createTextOutput(s){return{s,setMimeType(){return this}}}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..','server','bx_companion.gs'),'utf8'),ctx);
const call=b=>{const r=ctx.bxTry_({postData:{contents:JSON.stringify(b)}});return r?JSON.parse(r.s):null;};
let pass=0,fail=0;const ok=(m,c)=>{if(c){pass++;console.log("  ok   ",m)}else{fail++;console.log("  FAIL ",m)}};
ctx.bxSetup();
ok("not ours: another action is left to the Companion", call({action:"login"})===null);
ok("ping", call({action:"bxPing"}).v==="BX4");
const own={action:"bxAdmin",crmUser:"Mukesh Verma",crmPin:"9999"};
ok("a non-owner cannot sync", call({action:"bxAdmin",crmUser:"Vivek",crmPin:"1",op:"sync"}).ok===false);
const site={client:"Nitin Jain",code:"CL010",area:"Model Town",city:"Panipat",stage:"Brickwork",brand:"HULIOT",kind:"Client",ew:"Going on",quotes:2,lastQuote:"2026-11-02",architect:{name:"Roshan Lal - Radiant",code:"AR020",town:"Panipat"},plumber:null,exec:{name:"Mukesh Verma",mobile:"9466600611"}};
let r=call(Object.assign({op:"sync",people:[{id:"BX1",name:"Rahul",mobile:"9812345678",brand:"HULIOT",company:"Huliot India",city:"Panipat",active:"Y"},{id:"BX2",name:"Amit",mobile:"9812345679",brand:"TOTO",company:"TOTO",active:"Y"}],books:[{bxId:"BX1",sites:[site]},{bxId:"BX2",sites:[]}]},own));
ok("owner syncs 2 people, 2 books", r.ok&&r.people===2&&r.books===2);
ok("no PIN yet: told to ask Energy World", /not set yet/.test(call({action:"bxLogin",mobile:"9812345678",pin:"4821"}).err));
ok("owner sets the PIN", call(Object.assign({op:"pin",id:"BX1",pin:"4821"},own)).ok);
ok("the PIN is not kept in plain", !JSON.stringify(SS.sheets.BX_People.v).includes("4821"));
ok("wrong PIN refused", call({action:"bxLogin",mobile:"9812345678",pin:"1111"}).ok===false);
r=call({action:"bxLogin",mobile:"98123 45678",pin:"4821"});
ok("right PIN signs in, gets a token and who he is", r.ok&&r.tok.length===40&&r.me.brand==="HULIOT");
const tok=r.tok;
r=call({action:"bxBook",tok});
ok("his book: his one site, the architect without a phone", r.ok&&r.sites.length===1&&r.sites[0].architect.code==="AR020"&&!("mobile" in r.sites[0].architect));
ok("a made-up token is signed out", call({action:"bxBook",tok:"x".repeat(40)}).out===1);
ok("a follow-up on a site not his is refused", /not given/.test(call({action:"bxSave",tok,fu:{client:"Somebody Else",status:"Ongoing",remark:"hi"}}).err));
ok("a follow-up needs a remark", /remark/.test(call({action:"bxSave",tok,fu:{client:"Nitin Jain",status:"Ongoing",remark:""}}).err));
ok("a follow-up needs a real status", /Pick/.test(call({action:"bxSave",tok,fu:{client:"Nitin Jain",status:"Maybe",remark:"x"}}).err));
ok("an .exe is refused", /PDF or a photo/.test(call({action:"bxSave",tok,fu:{client:"Nitin Jain",status:"Ongoing",remark:"x"},file:{b64:"AAAA",type:"application/x-msdownload"}}).err));
r=call({action:"bxSave",tok,fu:{client:"nitin jain",status:"Ongoing",remark:"Met the plumber, sample fitted",next:"2026-11-20"},file:{b64:Buffer.from("%PDF-1.4 test").toString("base64"),type:"application/pdf",name:"q.pdf"}});
ok("a follow-up with a quote is saved, the file in Drive", r.ok&&r.fu.hasFile&&files.length===1&&r.fu.client==="Nitin Jain");
r=call({action:"bxBook",tok});
ok("his list shows it, with the file's name but never its link", r.fus.length===1&&r.fus[0].fileName&&!JSON.stringify(r.fus).includes("https://drive"));
r=call(Object.assign({op:"pull",since:""},own));
ok("the owner pulls it, with the link", r.ok&&r.rows.length===1&&r.rows[0].file.url.startsWith("https://drive")&&r.rows[0].bxName==="Rahul");
const ra=call(Object.assign({op:"all"},own));
ok("BX2: the owner sees every man (no PIN hash), every book and every follow-up with its link", ra.ok&&ra.people.length===2&&ra.people.every(x=>!("pinHash" in x))&&ra.people.find(x=>x.id==="BX1").hasPin===true&&ra.books.length===2&&ra.fus.length===1&&ra.fus[0].file.url.startsWith("https://drive"));
ok("BX2: a non-owner cannot have the whole view", call({action:"bxAdmin",crmUser:"Vivek",crmPin:"1",op:"all"}).ok===false);
ok("pull after its time returns nothing new", call(Object.assign({op:"pull",since:r.rows[0].at},own)).rows.length===0);
call(Object.assign({op:"sync",people:[{id:"BX1",name:"Rahul",mobile:"9812345678",brand:"HULIOT",company:"Huliot India",active:"N"}],books:[]},own));
ok("blocked: the open session stops on the next tap", call({action:"bxBook",tok}).out===1);
ok("blocked: cannot sign in again", call({action:"bxLogin",mobile:"9812345678",pin:"4821"}).ok===false);
ok("a man left out of the sync is no longer active", SS.sheets.BX_People.v.find(x=>x[0]==="BX2")[6]==="N");
ok("the PIN survives a re-sync", SS.sheets.BX_People.v.find(x=>x[0]==="BX1")[7].length===64);
for(let i=0;i<5;i++)call({action:"bxLogin",mobile:"9812345679",pin:"0000"});
ok("five wrong tries lock that mobile", /Too many/.test(call({action:"bxLogin",mobile:"9812345679",pin:"0000"}).err));
/* ---- BX3: a site he adds himself ---- */
const fp=(k,v)=>crypto.createHash('sha256').update("ew|"+k+"|"+v).digest('hex').slice(0,16);
call(Object.assign({op:"sync",people:[{id:"BX1",name:"Rahul",mobile:"9812345678",brand:"HULIOT",company:"Huliot India",active:"Y"}],books:[{bxId:"BX1",sites:[site]}],dup:{m:{[fp("m","9466600611")]:"CL"},n:{[fp("n","vinay gupta")]:"CL"}}},own));
const t2=call({action:"bxLogin",mobile:"9812345678",pin:"4821"}).tok;
let a=call({action:"bxAddSite",tok:t2,site:{client:"Ramesh Kumar",mobile:"9811111111",city:"Panipat",area:"Sector 13",stage:"Brickwork / Masonry",architect:"Somebody"}});
ok("BX3: a new site is taken, no duplicate", a.ok&&a.add.status==="new"&&!a.dup);
a=call({action:"bxAddSite",tok:t2,site:{client:"Mr. Vinay  Gupta",mobile:"9822222222",city:"Panipat"}});
ok("BX3: a name already with Energy World is said, and asked before sending", !a.ok&&a.dup==="ew"&&a.ask&&/already with Energy World/.test(a.err));
a=call({action:"bxAddSite",tok:t2,site:{client:"New Name",mobile:"94666 00611",city:"Panipat"}});
ok("BX3: a mobile already with Energy World says client, never whose", !a.ok&&a.dup==="ew"&&/a client/.test(a.err)&&!/Mukesh|Vinay/.test(a.err));
a=call({action:"bxAddSite",tok:t2,confirm:1,site:{client:"New Name",mobile:"9466600611",city:"Panipat"}});
ok("BX3: he can still send it; it is marked as a duplicate for the owner", a.ok&&a.dup==="ew");
a=call({action:"bxAddSite",tok:t2,site:{client:"nitin jain",mobile:"9833333333",city:"Panipat"}});
ok("BX3: a site already in his list is refused outright", !a.ok&&a.dup==="yours"&&!a.ask);
a=call({action:"bxAddSite",tok:t2,site:{client:"Ramesh Kumar",mobile:"9811111111",city:"Panipat"}});
ok("BX3: the same site sent again is caught", !a.ok&&a.dup==="sent"&&/You sent this site/.test(a.err));
ok("BX3: name, mobile and district are needed", /name/.test(call({action:"bxAddSite",tok:t2,site:{client:"",mobile:"9811111112",city:"Panipat"}}).err)&&/mobile/.test(call({action:"bxAddSite",tok:t2,site:{client:"Abc Def",mobile:"123",city:"Panipat"}}).err)&&/district/.test(call({action:"bxAddSite",tok:t2,site:{client:"Abc Def",mobile:"9811111113"}}).err));
ok("BX3: the book does not hold the CRM's numbers in the clear", !JSON.stringify(SS.sheets.BX_Dup.v).includes("9466600611")&&!/vinay/i.test(JSON.stringify(SS.sheets.BX_Dup.v)));
let L=call(Object.assign({op:"leads"},own));
ok("BX3: the owner pulls both sites with the duplicate flag", L.ok&&L.rows.length===2&&L.rows.find(x=>x.client==="New Name").dup==="ew");
ok("BX3: a non-owner cannot pull them", call({action:"bxAdmin",crmUser:"Vivek",crmPin:"1",op:"leads"}).ok===false);
ok("BX3: the owner's decision goes back to his app", call(Object.assign({op:"leadset",lid:L.rows[0].lid,status:"accepted",note:"Added as lead"},own)).ok && call({action:"bxBook",tok:t2}).adds.find(x=>x.lid===L.rows[0].lid).status==="accepted");
/* BX4 - the book's fingerprints are more than one cell holds */
{ const big={m:{},n:{}}; for(let i=0;i<3000;i++){ big.m[fp("m","98"+String(10000000+i))]="CL"; big.n[fp("n","name "+i)]="LD"; }
  call(Object.assign({op:"sync",people:[{id:"BX1",name:"Rahul",mobile:"9812345678",brand:"HULIOT",company:"Huliot India",active:"Y"}],books:[{bxId:"BX1",sites:[site]}],dup:big},own));
  const r=call({action:"bxAddSite",tok:t2,site:{client:"Big Book Man",mobile:"9810002999",city:"Panipat"}});
  ok("BX4: with 6,000 fingerprints the last mobile is still found", !r.ok&&r.dup==="ew"); }
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
