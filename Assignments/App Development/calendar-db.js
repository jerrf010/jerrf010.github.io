// calendar-db.js - Calendar Database Management

class CalendarDatabase {
    constructor() {
        this.key = 'heyday_calendar_events';
        this.usersKey = 'heyday_users';
        this.currentUserKey = 'heyday_current_user';
    }

    // Add these methods to the CalendarDatabase class in calendar-db.js

    // Get events within N days (for notifications)
    getEventsWithinDays(days = 3) {
        const events = this.getAllEvents();
        const today = new Date(2026, 1, 11); // February 11, 2026
        const upcoming = [];

        for (let i = 0; i <= days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateString = this.formatDate(date);

            if (events[dateString]) {
                events[dateString].forEach(event => {
                    upcoming.push({
                        date: date,
                        dateString: dateString,
                        daysUntil: i,
                        ...event
                    });
                });
            }
        }

        return upcoming;
    }

    // Get count of events within N days
    getEventsCountWithinDays(days = 3) {
        return this.getEventsWithinDays(days).length;
    }
    // Get current user
    getCurrentUser() {
        const user = localStorage.getItem(this.currentUserKey);
        return user ? JSON.parse(user) : null;
    }

    // Get all events for current user
    getAllEvents() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return {};

        const allEvents = JSON.parse(localStorage.getItem(this.key) || '{}');
        return allEvents[currentUser.id] || {};
    }

    // Save all events for current user
    saveAllEvents(events) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        const allEvents = JSON.parse(localStorage.getItem(this.key) || '{}');
        allEvents[currentUser.id] = events;
        localStorage.setItem(this.key, JSON.stringify(allEvents));
        return true;
    }

    // Add or update an event
    saveEvent(dateString, event) {
        const events = this.getAllEvents();

        if (!events[dateString]) {
            events[dateString] = [];
        }

        // Check if event already exists (update scenario)
        const eventIndex = events[dateString].findIndex(e => e.id === event.id);
        if (eventIndex !== -1) {
            events[dateString][eventIndex] = event;
        } else {
            events[dateString].push(event);
        }

        return this.saveAllEvents(events);
    }

    // Delete an event
    deleteEvent(dateString, eventId) {
        const events = this.getAllEvents();

        if (events[dateString]) {
            const eventIndex = events[dateString].findIndex(e => e.id === eventId);
            if (eventIndex !== -1) {
                events[dateString].splice(eventIndex, 1);

                // Remove date entry if no more events
                if (events[dateString].length === 0) {
                    delete events[dateString];
                }

                return this.saveAllEvents(events);
            }
        }
        return false;
    }

    // Delete all events for a date
    deleteAllEventsForDate(dateString) {
        const events = this.getAllEvents();
        delete events[dateString];
        return this.saveAllEvents(events);
    }

    // Delete all events for multiple dates
    deleteAllEventsForDates(dateStrings) {
        const events = this.getAllEvents();
        dateStrings.forEach(dateString => {
            delete events[dateString];
        });
        return this.saveAllEvents(events);
    }

    // Get events for a specific date
    getEventsForDate(dateString) {
        const events = this.getAllEvents();
        return events[dateString] || [];
    }

    // Get upcoming events (next N days)
    getUpcomingEvents(days = 14) {
        const events = this.getAllEvents();
        const today = new Date(2026, 1, 11); // February 11, 2026
        const upcoming = [];

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateString = this.formatDate(date);

            if (events[dateString]) {
                events[dateString].forEach(event => {
                    upcoming.push({
                        date: date,
                        dateString: dateString,
                        ...event
                    });
                });
            }
        }

        // Sort by date
        upcoming.sort((a, b) => a.date - b.date);
        return upcoming;
    }

    // Get all events with their dates
    getAllEventsWithDates() {
        const events = this.getAllEvents();
        const allEvents = [];

        for (const dateString in events) {
            const date = this.parseDateString(dateString);
            events[dateString].forEach(event => {
                allEvents.push({
                    date: date,
                    dateString: dateString,
                    ...event
                });
            });
        }

        return allEvents;
    }

    // Format date as YYYY-MM-DD
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Parse date string to Date object
    parseDateString(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    // Generate unique event ID
    generateEventId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Clear all events for current user
    clearAllEvents() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        const allEvents = JSON.parse(localStorage.getItem(this.key) || '{}');
        allEvents[currentUser.id] = {};
        localStorage.setItem(this.key, JSON.stringify(allEvents));
        return true;
    }

    // Import events from external source (like Google Calendar)
    importEvents(eventsArray) {
        const events = this.getAllEvents();

        eventsArray.forEach(eventData => {
            const dateString = eventData.dateString;
            if (!events[dateString]) {
                events[dateString] = [];
            }
            events[dateString].push(eventData.event);
        });

        return this.saveAllEvents(events);
    }

    // Get events count per date for calendar indicators
    getEventsCountByDate() {
        const events = this.getAllEvents();
        const counts = {};

        for (const dateString in events) {
            counts[dateString] = {
                total: events[dateString].length,
                assignments: events[dateString].filter(e => e.type === 'assignment' || e.type === 'exam').length,
                study: events[dateString].filter(e => e.type === 'study').length,
                other: events[dateString].filter(e => !['assignment', 'exam', 'study'].includes(e.type)).length
            };
        }

        return counts;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarDatabase;
}