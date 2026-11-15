import {forwardAstronaut} from '../../../../../lib/astronaut-api';

export async function PUT(request,{params}) {
  const {astronautId}=await params;
  return forwardAstronaut(request,[astronautId,'garmin']);
}
