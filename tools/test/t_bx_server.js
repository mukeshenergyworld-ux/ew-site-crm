const crypto=require('crypto'),fs=require('fs'),vm=require('vm');
function Sheet(name){this.name=name;this.v=[];}
Sheet.prototype.getRange=function(r,c,nr,nc){const sh=this;if(typeof r==="string")return{setNumberFormat(){}};return{setValues(vals){for(let i=0;i<vals.length;i++){while(sh.v.length<r+i)sh.v.push([]);sh.v[r-1+i]=vals[i].slice();}return this;},setFontWeight(){return this;},clearContent(){for(let i=0;i<nr;i++)sh.v[r-1+i]=Array(nc).fill("");}}};
Sheet.prototype.getDataRange=function(){const sh=this;return{getValues(){return sh.v.filter((row,i)=>i===0||row.some(x=>x!==""&&x!=null)).map(r=>r.slice());}}};
Sheet.prototype.appendRow=function(a){this.v.push(a.slice());};Sheet.prototype.getLastColumn=function(){return (this.v[0]||[]).length;};Sheet.prototype.setFrozenRows=function(){};Sheet.prototype.getLastRow=function(){return this.v.length;};
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
ok("ping", call({action:"bxPing"}).v==="BX6");
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
ok("BX3/BX5: the same site sent again by him is caught - it is in his list already", !a.ok&&a.dup==="yours"&&/You sent this site/.test(a.err)&&!a.ask);
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
/* ---- BX5: the mobile first; found -> name, brands bought, brands quoted; on his list at once ---- */
{ const V={k:"CL",n:"Vinay Gupta",c:"CL004",a:"Model Town, Panipat",w:["HULIOT","HINDWARE"],q:["DRP"]};
  call(Object.assign({op:"sync",people:[{id:"BX1",name:"Rahul",mobile:"9812345678",brand:"HULIOT",company:"Huliot India",active:"Y"},{id:"BX3",name:"Naveen Kumar",mobile:"8860087102",brand:"OYSTER",company:"Oyster India",active:"Y"}],books:[{bxId:"BX1",sites:[site]},{bxId:"BX3",sites:[]}],
    dup:{m:{[fp("m","9466600611")]:V,[fp("m","9811111111")]:"LD"},n:{}}},own));
  call(Object.assign({op:"pin",id:"BX3",pin:"5555"},own));
  const tn=call({action:"bxLogin",mobile:"8860087102",pin:"5555"}).tok;
  let c=call({action:"bxCheck",tok:tn,mobile:"+91 94666 00611"});
  ok("BX5: check by mobile finds Energy World's client with the brands bought and quoted", c.ok&&c.found==="ew"&&c.ew.name==="Vinay Gupta"&&c.ew.code==="CL004"&&c.ew.won.join()==="HULIOT,HINDWARE"&&c.ew.quoted.join()==="DRP"&&c.ew.kind==="Client");
  ok("BX5: the answer carries no quote, value or file", !/quote(Id|No|Value|Url)|amount|rate|url/i.test(JSON.stringify(c)));
  c=call({action:"bxCheck",tok:tn,mobile:"9800000001"});
  ok("BX5: an unknown mobile is new", c.ok&&c.found==="");
  ok("BX5: a check needs a signed-in man", call({action:"bxCheck",tok:"x".repeat(40),mobile:"9466600611"}).out===1);
  let a5=call({action:"bxAddSite",tok:tn,site:{mobile:"9466600611"}});
  ok("BX5: found by mobile -> on his list at once, no name or district asked", a5.ok&&a5.linked===1&&a5.add.status==="linked");
  let bk=call({action:"bxBook",tok:tn});
  ok("BX5: it shows in his sites with the brands", bk.sites.length===1&&bk.sites[0].client==="Vinay Gupta"&&bk.sites[0].won.join()==="HULIOT,HINDWARE"&&bk.sites[0].mine===1);
  ok("BX5: checking it again says it is his", call({action:"bxCheck",tok:tn,mobile:"9466600611"}).found==="yours");
  ok("BX5: adding it again is refused", call({action:"bxAddSite",tok:tn,site:{mobile:"9466600611"}}).dup==="yours");
  a5=call({action:"bxAddSite",tok:tn,site:{client:"Suresh Kumar",mobile:"9800000001",city:"Karnal",stage:"Plastering"}});
  ok("BX5: a new site is on his list at once", a5.ok&&call({action:"bxBook",tok:tn}).sites.some(x=>x.client==="Suresh Kumar"&&x.mine===1&&x.ew==="Added by you"));
  ok("BX5: he can save a follow-up on a site he added", call({action:"bxSave",tok:tn,fu:{client:"Suresh Kumar",status:"Ongoing",remark:"met him"}}).ok);
  ok("BX5: Rahul (another man) does not see Naveen's sites", !call({action:"bxBook",tok:t2}).sites.some(x=>x.client==="Suresh Kumar"));
  ok("BX5: Rahul cannot save on Naveen's site", call({action:"bxSave",tok:t2,fu:{client:"Suresh Kumar",status:"Ongoing",remark:"x"}}).ok===false);
  c=call({action:"bxCheck",tok:t2,mobile:"9800000001"});
  ok("BX5: another brand's man is told another brand follows it", c.found==="sent"&&c.sameBrand===false);
  a5=call({action:"bxAddSite",tok:t2,site:{client:"Suresh Kumar",mobile:"9800000001",city:"Karnal"}});
  ok("BX5: another brand may add the same site without being stopped", a5.ok&&a5.dup==="other-brand");
  const Ln=call(Object.assign({op:"leads"},own)).rows.find(x=>x.client==="Suresh Kumar"&&x.bxId==="BX3");
  call(Object.assign({op:"leadset",lid:Ln.lid,status:"rejected",note:"not our area"},own));
  ok("BX5: once the owner says Not taken it leaves his list", !call({action:"bxBook",tok:tn}).sites.some(x=>x.client==="Suresh Kumar"));
  ok("BX5: an old-style fingerprint still says lead", call({action:"bxCheck",tok:tn,mobile:"9811111111"}).found!=="" );
  for(let i=0;i<70;i++) call({action:"bxCheck",tok:tn,mobile:"9800000009"});
  ok("BX5: no more than 60 checks an hour", /Too many checks/.test(call({action:"bxCheck",tok:tn,mobile:"9800000009"}).err)); }
/* ---- BX6: partners by name or mobile, Won with payments ---- */
{ const own6={action:"bxAdmin",crmUser:"Mukesh Verma",crmPin:"9999"};
  SS.sheets.BX_Fu.v[0]=SS.sheets.BX_Fu.v[0].slice(0,11);   /* a sheet made before BX6 */
  const P=[{n:"Roshan Lal - Radiant",c:"AR020",t:"Panipat",r:"Architect",m:"9812000001"},{n:"Ramesh Plumber",c:"PL011",t:"Karnal",r:"Plumber",m:"9812000002"},{n:"Rakesh Kumar",c:"PL012",t:"Panipat",r:"Plumber",m:"9900000003"}];
  let r6=call(Object.assign({op:"sync",people:[{id:"BX9",name:"Naveen Kumar",mobile:"8860000002",brand:"OYSTER",company:"Oyster India",active:"Y"}],books:[{bxId:"BX9",sites:[{client:"Anil Site",brand:"OYSTER"}]}],partners:P},own6));
  ok("BX6: the owner's sync carries the partners", r6.ok&&SS.sheets.BX_Partners.v.length===2);
  call(Object.assign({op:"pin",id:"BX9",pin:"5555"},own6));
  const t9=call({action:"bxLogin",mobile:"8860000002",pin:"5555"}).tok;
  let q=call({action:"bxPartners",tok:t9,q:"ros",kind:"architect"});
  ok("BX6: typing the name finds the architect", q.ok&&q.rows.length===1&&q.rows[0].c==="AR020");
  ok("BX6: the answer never carries a mobile", !JSON.stringify(q).includes("98120"));
  q=call({action:"bxPartners",tok:t9,q:"98120",kind:"plumber"});
  ok("BX6: the first digits of the mobile find the plumber - plumbers only", q.rows.length===1&&q.rows[0].n==="Ramesh Plumber"&&!JSON.stringify(q).includes("9812000002"));
  ok("BX6: two letters list every plumber starting so", call({action:"bxPartners",tok:t9,q:"ra",kind:"plumber"}).rows.length===2);
  ok("BX6: the code finds him", call({action:"bxPartners",tok:t9,q:"PL012"}).rows[0].n==="Rakesh Kumar");
  ok("BX6: one letter asks nothing", call({action:"bxPartners",tok:t9,q:"r"}).rows.length===0);
  ok("BX6: signed out cannot search", call({action:"bxPartners",tok:"y".repeat(40),q:"ros"}).out===1);
  let a6=call({action:"bxAddSite",tok:t9,site:{client:"Kamal Garg",mobile:"9700000001",city:"Panipat",architect:"Roshan",archCode:"AR020",plumber:"Ramesh P",plumMob:"9812000002"}});
  const L6=SS.sheets.BX_Leads.v[0], row6=SS.sheets.BX_Leads.v.find(x=>x[L6.indexOf("client")]==="Kamal Garg"), g6=k=>row6[L6.indexOf(k)];
  ok("BX6: a picked architect is saved under Energy World's name and code", a6.ok&&g6("architect")==="Roshan Lal - Radiant"&&g6("archCode")==="AR020");
  ok("BX6: a 'new' plumber whose mobile is on the book becomes that plumber", g6("plumber")==="Ramesh Plumber"&&g6("plumCode")==="PL011"&&!g6("plumMob"));
  call({action:"bxAddSite",tok:t9,site:{client:"Om Prakash",mobile:"9700000002",city:"Panipat",plumber:"Sonu Fitter",plumMob:"9700011111"}});
  const row7=SS.sheets.BX_Leads.v.find(x=>x[L6.indexOf("client")]==="Om Prakash");
  ok("BX6: a really new plumber keeps his name and mobile for Energy World", row7[L6.indexOf("plumber")]==="Sonu Fitter"&&row7[L6.indexOf("plumMob")]==="9700011111"&&!row7[L6.indexOf("plumCode")]);
  ok("BX6: his added site shows the partner's code", call({action:"bxBook",tok:t9}).sites.find(x=>x.client==="Kamal Garg").architect.code==="AR020");
  let qf=call({action:"bxSave",tok:t9,fu:{client:"Kamal Garg",status:"Ongoing",remark:"quote given",next:"2026-12-01"},file:{b64:Buffer.from("%PDF q").toString("base64"),type:"application/pdf",name:"q.pdf"}});
  ok("BX6: an old sheet's heading grows a won column", SS.sheets.BX_Fu.v[0].length===12&&SS.sheets.BX_Fu.v[0][11]==="won");
  const W={models:"OY-201 basin\nOY-330 WC",quote:qf.fu.fid,amount:185000,gst:"extra",pays:[{kind:"Advance",amt:50000,mode:"UPI",date:"2026-11-27",ref:"UTR123"}]};
  ok("BX6: Won with an amount needs GST extra or included", /GST/.test(call({action:"bxSave",tok:t9,fu:{client:"Kamal Garg",status:"Won",remark:"won",won:Object.assign({},W,{gst:""})}}).err));
  ok("BX6: a payment without its mode is refused", /cash \/ UPI/.test(call({action:"bxSave",tok:t9,fu:{client:"Kamal Garg",status:"Won",remark:"won",won:Object.assign({},W,{pays:[{kind:"Advance",amt:5,date:"2026-11-27"}]})}}).err));
  ok("BX6: a cheque needs its number", /cheque number/.test(call({action:"bxSave",tok:t9,fu:{client:"Kamal Garg",status:"Won",remark:"won",won:Object.assign({},W,{pays:[{kind:"Part payment",amt:5,mode:"Cheque",date:"2026-11-27"}]})}}).err));
  ok("BX6: a quote from another site cannot be the one that won", /not one of yours/.test(call({action:"bxSave",tok:t9,fu:{client:"Om Prakash",status:"Won",remark:"won",won:W}}).err));
  let w6=call({action:"bxSave",tok:t9,fu:{client:"Kamal Garg",status:"Won",remark:"Order confirmed",won:W}});
  ok("BX6: Won saved with models, the quote, amount, GST and the advance", w6.ok&&w6.fu.won.amount===185000&&w6.fu.won.gst==="extra"&&w6.fu.won.pays[0].mode==="UPI"&&w6.fu.won.quote===qf.fu.fid);
  ok("BX6: a Won save with nothing extra is still fine", call({action:"bxSave",tok:t9,fu:{client:"Kamal Garg",status:"Won",remark:"still won"}}).ok);
  ok("BX6: his book carries the won details", call({action:"bxBook",tok:t9}).fus.some(f=>f.won&&f.won.models.includes("OY-330")));
  const pl=call(Object.assign({op:"pull",since:""},own6)).rows.find(f=>f.won);
  ok("BX6: the owner's pull carries them", pl&&pl.won.pays[0].ref==="UTR123");
  ok("BX6: and the owner's whole view", call(Object.assign({op:"all"},own6)).fus.some(f=>f.won&&f.won.amount===185000));
}
console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
