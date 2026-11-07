import { env } from 'cloudflare:workers';
import { seed } from '../../data';
export async function GET(request: Request) {
 const owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return Response.json({error:'Please sign in to access your workspace.'},{status:401});
 const row=await env.DB!.prepare('SELECT revision, body FROM workspaces WHERE owner = ?').bind(owner).first<{revision:number,body:string}>();
 return Response.json(row?{revision:row.revision,data:JSON.parse(row.body)}:{revision:0,data:seed},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request: Request){
 const owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return Response.json({error:'Sign in required'},{status:401});
 if(request.headers.get('X-Studio-Request')!=='1')return Response.json({error:'Invalid request'},{status:403});
 const raw=await request.text();if(raw.length>2000000)return Response.json({error:'Workspace exceeds 2 MB. Export and archive older records.'},{status:413});
 try{
 const {revision,data}=JSON.parse(raw);
 if(!Number.isInteger(revision)||!data||!Array.isArray(data.records)||data.records.length>5000||!data.settings||data.records.some((r:any)=>typeof r.id!=='string'||typeof r.type!=='string'||typeof r.title!=='string')||new Set(data.records.map((r:any)=>r.id)).size!==data.records.length) return Response.json({error:'Invalid workspace format'},{status:400});
 const body=JSON.stringify(data);
 const result= revision===0 ? await env.DB!.prepare('INSERT INTO workspaces(owner,revision,body) VALUES (?,1,?) ON CONFLICT(owner) DO NOTHING').bind(owner,body).run():await env.DB!.prepare('UPDATE workspaces SET revision=revision+1, body=? WHERE owner=? AND revision=?').bind(body,owner,revision).run();
 if(!result.meta.changes)return Response.json({error:'Another device saved changes. Export your work, then reload before editing.'},{status:409});
 return Response.json({revision:revision+1});
 }catch{return Response.json({error:'Unable to save workspace. Check your data and retry.'},{status:400});}
}
