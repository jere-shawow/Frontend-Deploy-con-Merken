import {createHmac,timingSafeEqual} from 'node:crypto';

export const cookieName='orbit_demo_session';
export const duration=8*60*60;

function equal(a,b) {
  const left=Buffer.from(a);
  const right=Buffer.from(b);
  return left.length===right.length && timingSafeEqual(left,right);
}

export function credentialsMatch(username,password) {
  const expected=process.env.ORBIT_DEMO_PASSWORD;
  return Boolean(expected && username==='demo' && equal(password,expected));
}

function sign(expiry) {
  return createHmac('sha256',process.env.ORBIT_DEMO_SESSION_SECRET).update(expiry).digest('hex');
}

export function createSession() {
  if (!process.env.ORBIT_DEMO_SESSION_SECRET) return null;
  const expiry=String(Math.floor(Date.now()/1000)+duration);
  return expiry+'.'+sign(expiry);
}

export function validSession(value) {
  if (!process.env.ORBIT_DEMO_SESSION_SECRET || !value || !/^\d{10}\.[a-f0-9]{64}$/.test(value)) return false;
  const [expiry,signature]=value.split('.');
  return Number(expiry)>Date.now()/1000 && equal(signature,sign(expiry));
}
