import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestRecommendations} from './recommendations-api.js';
const req=(body={allowRemoteAnalysis:true},origin='https://ground.test')=>new Request('https://ground.test/api/astronauts/1/recommendations',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('rejects foreign origins, identifiers and missing authorization before upstream',async()=>{
  const options={base:'https://backend.test',token:'secret',origin:'https://ground.test',fetcher:()=>{throw new Error('must not call')}};
  assert.equal((await requestRecommendations(req({},'https://foreign.test'),'1',options)).status,403);
  assert.equal((await requestRecommendations(req(),'../1',options)).status,400);
  assert.equal((await requestRecommendations(req({}),'1',options)).status,400);
});
test('injects server token, sends no names and returns no secret',async()=>{
  const response=await requestRecommendations(req(),'1',{base:'https://backend.test',token:'never-return-this',origin:'https://ground.test',fetcher:async(url,options)=>{
    assert.equal(url.pathname,'/api/analysis/astronauts/1');assert.equal(options.headers['X-Analysis-Token'],'never-return-this');
    assert.deepEqual(JSON.parse(options.body),{allowRemoteAnalysis:true,reportId:null});
    return Response.json({provider:'AWS_BEDROCK',context:{},narrative:{}});
  }});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.text()).includes('never-return-this'),false);
});
test('does not reveal backend error details or credentials',async()=>{
  const response=await requestRecommendations(req(),'1',{base:'https://backend.test',token:'secret',fetcher:async()=>new Response('PRIVATE DETAIL',{status:503})});
  assert.equal(response.status,503);assert.equal((await response.text()).includes('PRIVATE DETAIL'),false);
});
