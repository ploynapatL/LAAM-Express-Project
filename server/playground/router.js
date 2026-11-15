'use strict';
const express=require('express');
const {Pool}=require('pg');
const {timingSafeEqual,randomUUID}=require('node:crypto');
const {cases}=require('./scenarios');
const {requirements}=require('./catalog');
const byId=new Map(cases.map(c=>[c.id,c]));
const equals=(a,b)=>{const x=Buffer.from(a||'');const y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
function playgroundRouter(){
  const router=express.Router();
  const secret=process.env.PLAYGROUND_TOKEN||'';
  if(secret.length<32)throw new Error('PLAYGROUND_TOKEN must be at least 32 characters');
  const pool=new Pool({host:process.env.PLAYGROUND_DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.PLAYGROUND_DB_USER,password:process.env.PLAYGROUND_DB_PASSWORD,max:2,connectionTimeoutMillis:5000,statement_timeout:5000,query_timeout:6500});
  router.use((req,res,next)=>{
    res.set('Cache-Control','no-store');
    const ip=req.socket.remoteAddress||'';
    if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip))return res.status(403).json({error:'Local playground only'});
    // Browser origins must be local; non-browser tools can omit Origin and must still supply token.
    const origin=req.get('origin');
    if(origin && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))return res.status(403).json({error:'Local origin required'});
    const header=/^Bearer (\S+)$/i.exec(req.get('Authorization')||'');
    if(!header||!equals(header[1],secret))return res.status(401).json({error:'Playground token required'});
    next();
  });
  router.get('/catalog',(_req,res)=>res.json({requirements,tests:cases.map(({id,fr,name,kind,coverage})=>({id,fr,name,kind,coverage})),mode:'LOCAL_POSTGRESQL',execution:'ROLLBACK_ONLY'}));
  router.post('/run/:testId',async(req,res)=>{
    const test=byId.get(req.params.testId);
    if(!test)return res.status(404).json({error:'Unknown test ID'});
    const executionId=randomUUID();const timestamp=new Date().toISOString();const started=Date.now();
    let client,begun=false,result,verdict='ERROR';
    try{
      client=await pool.connect();await client.query('BEGIN');begun=true;
      // Protect all writes even if a test throws. No statement supplied by the browser is executed.
      await client.query("SET LOCAL lock_timeout = '1500ms'");
      await client.query("SET LOCAL statement_timeout = '5000ms'");
      result=await test.run(client);
      verdict=result.verdict||'PASS';
    }catch(e){
      const sqlstate=e.code||null;
      result={error:e.message.slice(0,300),sqlstate,constraint:e.constraint||null,expected:'See test objective and setup requirements'};
      verdict='ERROR';
    }finally{
      if(client){if(begun){try{await client.query('ROLLBACK')}catch(e){verdict='ERROR';result={...result,rollbackError:e.message};}} client.release();}
    }
    res.json({executionId,timestamp,testId:test.id,fr:test.fr,name:test.name,kind:test.kind,coverage:test.coverage,verdict,operation:verdict==='ERROR'?'ERROR':verdict==='NOT_IMPLEMENTED'?'NOT_IMPLEMENTED':result?.observed?.rejected?'DENIED':'SUCCEEDED',durationMs:Date.now()-started,transaction:'ROLLED_BACK',source:'ACTUAL_POSTGRESQL',evidence:result});
  });
  return router;
}
module.exports={playgroundRouter};
