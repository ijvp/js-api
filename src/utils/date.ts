const { differenceInDays } = require('date-fns');

const formatGoogleDateRange = (start: string, end: string) => {
	const startDate = new Date(start);
	const endDate = new Date(end);
	const now = new Date();
	const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const yesterday = new Date(today);
	yesterday.setUTCDate(today.getUTCDate() - 1);

	if (startDate.getTime() === endDate.getTime()) {
		if (endDate.getTime() === today.getTime()) {
			return { startDate: 'today', endDate: 'today' };
		};

		if (endDate.getTime() === yesterday.getTime()) {
			return { startDate: 'yesterday', endDate: 'yesterday' };
		}
	}

	if (endDate.getTime() === yesterday.getTime()) {
		return {
			startDate: `${differenceInDays(today, startDate)}daysAgo`,
			endDate: `${differenceInDays(today, endDate)}daysAgo`
		};
	}

	return { startDate: start, endDate: end }
};

module.exports = { formatGoogleDateRange };
