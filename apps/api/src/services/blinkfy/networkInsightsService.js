const MAX_RECOMMENDATIONS = 20;

function recommendConnections({ connections = [], targetRole, skills = [] } = {}) {
  const normalizedRole = typeof targetRole === 'string' ? targetRole.toLowerCase() : '';
  const wantedSkills = skills.map((skill) => String(skill).toLowerCase());
  return connections.filter((connection) => {
    const role = String(connection.role || '').toLowerCase();
    const connectionSkills = (connection.skills || []).map((skill) => String(skill).toLowerCase());
    return (normalizedRole && role.includes(normalizedRole)) || wantedSkills.some((skill) => connectionSkills.includes(skill));
  }).slice(0, MAX_RECOMMENDATIONS).map((connection) => ({ id: connection.id, name: connection.name, role: connection.role, requiresApproval: true }));
}

module.exports = { MAX_RECOMMENDATIONS, recommendConnections };
