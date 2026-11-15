import {NextResponse} from 'next/server';
import {cookieName,validSession} from './lib/demo-auth';

export function proxy(request) {
  if (validSession(request.cookies.get(cookieName)?.value)) {
    const response=NextResponse.next();
    response.headers.set('Cache-Control','private, no-store');
    return response;
  }
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({error:'Sign in required.'},{status:401,headers:{'Cache-Control':'no-store'}});
  }
  return new NextResponse(null,{status:307,headers:{Location:new URL('/login',process.env.ORBIT_PUBLIC_ORIGIN || request.url).href,'Cache-Control':'no-store'}});
}

export const config={matcher:['/','/directory/:path*','/api/((?!demo-session$).*)']};
