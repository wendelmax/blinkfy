function buildGroundedDraft({ inboundMessage, matches = [] }) {
  if (!matches.length) throw new Error('NO_GROUNDING_CONTEXT');
  const first = matches[0];
  return {
    channel: inboundMessage.channel,
    content: `Thanks for your question. According to our ${first.title} information: ${first.content}`,
    grounding: matches.map((match) => ({ chunkId: match.id, title: match.title })),
  };
}

module.exports = { buildGroundedDraft };
