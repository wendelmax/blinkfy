const { IntegrationAdapter } = require('./baseAdapter');

class CalendarAdapter extends IntegrationAdapter {
    constructor(config = {}) {
        super({ provider: 'google_calendar', category: 'calendar', config });
    }

    async executeAction(action, payload) {
        switch (action) {
            case 'send_calendar_invite':
                return this.sendInvite(payload);
            case 'list_events':
                return this.listEvents(payload);
            case 'cancel_event':
                return this.cancelEvent(payload);
            default:
                throw new Error(`Unknown calendar action: ${action}`);
        }
    }

    async sendInvite({ title, description, startTime, endTime, attendees, location }) {
        const eventId = `gcal_${Date.now()}`;
        return {
            eventId,
            provider: 'google_calendar',
            status: 'confirmed',
            htmlLink: `https://calendar.google.com/event?eid=${eventId}`,
            summary: title,
            description,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
            attendees: (attendees || []).map(email => ({ email, responseStatus: 'needsAction' })),
            location,
            created: new Date().toISOString(),
        };
    }

    async listEvents({ timeMin, timeMax, maxResults }) {
        return {
            items: [],
            provider: 'google_calendar',
            timeMin,
            timeMax,
            nextPageToken: null,
        };
    }

    async cancelEvent({ eventId }) {
        return {
            eventId,
            status: 'cancelled',
            provider: 'google_calendar',
        };
    }
}

module.exports = { CalendarAdapter };
