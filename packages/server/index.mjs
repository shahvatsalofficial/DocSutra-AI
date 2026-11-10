import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
const json=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});res.end(JSON.stringify(obj));};
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && crypto.timingSafeEqual(x,y);};
export async function createReadOnlyServer({reportPath,token,port=0,host='127.0.0.1'}){
 if(host!=='127.0.0.1'&&host!=='::1')throw new Error('Starter server permits loopback bindings only. Hosted multi-user API is a roadmap feature.');
 if(typeof token!=='string'||token.length<20)throw new Error('Set DOCSUTRA_SERVER_TOKEN to an unpredictable value with at least 20 characters.');
 const data=JSON.parse(await fs.readFile(reportPath,'utf8'));
 if(data.tool!=='DocSutra AI' || !data.summary || !Array.isArray(data.findings))throw new Error('Invalid DocSutra report');
 const srv=http.createServer((req,res)=>{
  if(req.url==='/health'&&req.method==='GET')return json(res,200,{status:'ok',scope:'loopback-readonly'});
  const header=req.headers.authorization||'';
  if(!header.startsWith('Bearer ')||!equal(header.slice(7),token))return json(res,401,{error:'unauthorized'});
  if(req.url==='/report'&&req.method==='GET')return json(res,200,data);
  return json(res,404,{error:'not_found'});
 });
 await new Promise((resolve,reject)=>{srv.once('error',reject);srv.listen(port,host,resolve)});
 return srv;
}
