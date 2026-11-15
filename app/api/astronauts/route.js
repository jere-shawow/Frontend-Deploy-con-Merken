import {forwardAstronaut} from '../../../lib/astronaut-api';
export const dynamic = 'force-dynamic';
export const GET = request => forwardAstronaut(request);
export const POST = GET;
