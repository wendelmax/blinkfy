function buildEngagementDraft({ topic = '', format = 'post', tone = 'professional' } = {}) {
  const cleanTopic = String(topic).trim();
  if (!cleanTopic) throw new Error('topic is required');
  if (!['post', 'comment', 'connection'].includes(format)) throw new Error('unsupported engagement format');
  return { format, tone, topic: cleanTopic, content: `${format === 'comment' ? 'A useful perspective on' : 'Thoughts on'} ${cleanTopic}.`, requiresApproval: true, published: false };
}

module.exports = { buildEngagementDraft };
