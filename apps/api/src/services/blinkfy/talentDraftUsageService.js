function usageFeatureForDraft(format) {
  if (format === 'post') return 'content.draft';
  if (format === 'comment') return 'comment.draft';
  return null;
}

function periodKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

module.exports = { usageFeatureForDraft, periodKey };
