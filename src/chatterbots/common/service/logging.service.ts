export class LoggingService {
	public logAndPrint = async (text: string): Promise<void> => {
		const logMessage = new Date() + " " + text;
		console.log(logMessage);
	};
}

export const loggingService = new LoggingService();
