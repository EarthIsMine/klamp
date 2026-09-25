import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { isAddress, type Address } from 'viem';
import { createReader, getCanonicalPool, tokenName, type NetworkConfig } from '../sdk/canonicalPool.js';
import { compareRoutes, type RouteHop } from '../sdk/compareRoutes.js';
const raw=JSON.parse(readFileSync(process.env.MANIFEST??'deployments/local.json','utf8'));
const network:NetworkConfig={...raw,chainId:BigInt(raw.chainId)};
const client=createReader(process.env.RPC_URL??'http://127.0.0.1:18545');
const json=(v:unknown)=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x);
createServer(async(req,res)=>{
 try {
  if(req.url==='/'&&req.method==='GET'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(readFileSync('demo/index.html'));return;}
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/config'&&req.method==='GET'){res.end(json({token:raw.token,chainId:raw.chainId,poolManager:raw.poolManager,poolId:raw.poolId}));return;}
  if(req.url!=='/api/check'||req.method!=='POST'){res.statusCode=404;res.end(json({error:'Not found'}));return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw Error('입력이 너무 큽니다.');}
  const input=JSON.parse(body);
  if(typeof input.token!=='string'||!isAddress(input.token)||!Array.isArray(input.branches)||input.branches.length>100)throw Error('토큰 주소와 경로 배열을 확인하세요.');
  const branches:RouteHop[][]=input.branches.map((b:unknown)=>{if(!Array.isArray(b)||b.length>100)throw Error('잘못된 경로입니다.');return b.map(h=>{if(!h||!isAddress(h.poolManager)||!isAddress(h.tokenIn)||!isAddress(h.tokenOut)||typeof h.poolId!=='string'||typeof h.chainId!=='string'||!/^\d+$/.test(h.chainId))throw Error('hop 필드를 확인하세요.');return {...h,chainId:BigInt(h.chainId)};});});
  const token=input.token as Address;
  const canonical=await getCanonicalPool(client,network,token);
  res.end(json({name:tokenName(token),canonical,comparison:compareRoutes(token,canonical,branches),candidateRoutes:branches,scope:'선언된 경로 정보 비교; 거래 전송 및 calldata 검증 미포함'}));
 }catch{res.statusCode=400;res.end(json({error:'입력 형식 또는 서버 설정을 확인하세요.'}));}
}).listen(Number(process.env.PORT??4173),'127.0.0.1',()=>console.log('Klamp demo: http://127.0.0.1:'+(process.env.PORT??4173)));
