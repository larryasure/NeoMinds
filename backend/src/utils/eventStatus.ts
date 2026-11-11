// Computes event status from start/end times instead of storing it in the DB.
// Status is always derived so it can never go stale as time passes.

export type EventStatus = "upcoming" | "live" | "ended";

export function getEventStatus(startTime: Date, endTime: Date, now: Date = new Date()): EventStatus {
	if (now < startTime) return "upcoming";
	if (now < endTime) return "live";
	return "ended";
}

// Copies the event and adds status for API responses
export function withEventStatus<T extends { startTime: Date; endTime: Date }>(
	event: T,
	now: Date = new Date(),
): T & { status: EventStatus } {
	return { ...event, status: getEventStatus(event.startTime, event.endTime, now) };
}
