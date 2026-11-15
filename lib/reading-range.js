export const rangeLabels={very_low:'Very low',low:'Low',normal:'In range',high:'High',very_high:'Very high'};

export function readingRange(metric) {
  const status=metric[8]?.status?.toLowerCase();
  return Object.hasOwn(rangeLabels,status)?status:undefined;
}
