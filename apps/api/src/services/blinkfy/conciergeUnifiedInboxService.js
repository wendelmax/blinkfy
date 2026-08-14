function aggregateInboxMessages(applications = []) {
  return applications.flatMap((application) => application.conciergeMessages.map((message) => ({ id: message.id, applicationId: application.id, candidateName: application.candidate.fullName, channel: message.channel, content: message.content, receivedAt: message.receivedAt }))).sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
}

module.exports = { aggregateInboxMessages };
