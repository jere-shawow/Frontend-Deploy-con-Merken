export function recommendationKey(astronautId) {
  if (!/^\d{1,18}$/.test(String(astronautId))) throw new Error('Invalid astronaut.');
  return 'pulsys:recommendations:v1:'+astronautId;
}

export function readRecommendations(storage, astronautId) {
  const raw=storage.getItem(recommendationKey(astronautId));
  if (raw===null) return [];
  const records=JSON.parse(raw);
  // Refuse to overwrite a damaged or incompatible history.
  if (!Array.isArray(records) || records.some(record=>!record || typeof record.id!=='string'
    || !Number.isFinite(Date.parse(record.savedAt)) || !record.result
    || String(record.result.astronautId)!==String(astronautId)
    || typeof record.result.narrative?.summary!=='string' || !record.result.context)) {
    throw new Error('Saved recommendation history could not be read. Existing data was preserved.');
  }
  return records;
}

export function saveRecommendation(storage, astronautId, result) {
  if (String(result?.astronautId)!==String(astronautId) || !result?.narrative?.summary || !result.context) {
    throw new Error('This recommendation does not belong to the selected astronaut.');
  }
  const records=readRecommendations(storage,astronautId);
  if (records.some(record=>record.result.generatedAt===result.generatedAt && record.result.narrative.summary===result.narrative.summary)) return records;
  const savedAt=new Date().toISOString();
  const next=[{id:globalThis.crypto.randomUUID(),savedAt,result},...records];
  // Write before reporting success; never silently discard older recommendations.
  storage.setItem(recommendationKey(astronautId),JSON.stringify(next));
  return next;
}

export function recommendationSections(summary) {
  const text=String(summary??'').trim().replace(/^(?:Nova\s*Pro(?=Nova\s*Pro|[\s:–—-]|$)[\s:–—-]*)+/i,'');
  if (!text) return [];
  // Reuse the original wording. These boundaries only organize the returned text.
  const action=/(?:^|\n+|(?<=[.!?])\s+)(?=What to do now:|Next steps:|Follow |Contact |Ask |Verify |Check |Discuss |Prioritize |Protect )/i;
  const match=action.exec(text);
  if (!match) return [{title:'Assessment and recommendations',text}];
  const overview=text.slice(0,match.index).trim();
  const steps=text.slice(match.index).trim().replace(/^(?:What to do now|Next steps):\s*/i,'');
  const leisure=/(?:\n+|(?<=[.!?])\s+)(?=Once the medical review|After the required review|Once the required review|During your next permitted off-duty)/i.exec(steps);
  return [overview&&{title:'Mission assessment',text:overview},
    {title:'Recommended next steps',text:leisure?steps.slice(0,leisure.index).trim():steps},
    leisure&&{title:'Off-duty options',text:steps.slice(leisure.index).trim()}].filter(Boolean);
}
