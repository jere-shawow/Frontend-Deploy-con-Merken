import {NextResponse} from 'next/server';
import {cookieName,createSession,credentialsMatch,duration} from '../../../lib/demo-auth';

export async function POST(request) {
  const form=await request.formData().catch(()=>null);
  const session=form && credentialsMatch(String(form.get('username')??''),String(form.get('password')??'')) ? createSession() : null;
  const response=new NextResponse(null,{status:303,headers:{Location:session?'/':'/login?error=1'}});
  response.headers.set('Cache-Control','no-store');
  if (session) response.cookies.set(cookieName,session,{httpOnly:true,sameSite:'strict',path:'/',maxAge:duration,
    secure:request.headers.get('x-forwarded-proto')==='https'||new URL(request.url).protocol==='https:'});
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ok:true}, {headers:{'Cache-Control':'no-store'}});
  response.cookies.set(cookieName, '', {httpOnly:true, sameSite:'strict', path:'/', maxAge:0});
  return response;
}
