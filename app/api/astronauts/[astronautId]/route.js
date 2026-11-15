import {forwardAstronaut} from '../../../../lib/astronaut-api';
export const dynamic = 'force-dynamic';
export async function GET(request, {params}) {
  const {astronautId}=await params;
  return forwardAstronaut(request,[astronautId]);
}
export const PUT = GET;
export const DELETE = GET;
