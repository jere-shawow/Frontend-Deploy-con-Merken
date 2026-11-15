export const states = {
  normal:'Normal', warning:'Warning', critical:'Critical', unknown:'Not assessed',
};

export function metricState(metric, statuses) {
  const [key, , value] = metric;
  const status = statuses?.[key];
  return value != null && Object.hasOwn(states, status) ? status : 'unknown';
}
