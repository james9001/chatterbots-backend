import { loggingService } from "./logging.service";

export class PrismaWrapperService {
	private doingThing = false;

	public executePrismaFunction = async (func: () => Promise<any>): Promise<any> => {
		if (this.doingThing) {
			return new Promise((resolver) => {
				setTimeout(() => {
					resolver(prismaWrapperService.executePrismaFunction(func));
				}, 5);
			});
		} else {
			this.doingThing = true;
			let result = null;
			try {
				result = await func();
			} catch (err: any) {
				//The handling right now is really a stub for if there are later problems
				await loggingService.logAndPrint(
					"Caught unexpected error in PrismaWrapperService! Rethrowing."
				);
				await loggingService.logAndPrint(err);
				throw err;
			}
			this.doingThing = false;
			return result;
		}
	};
}

export const prismaWrapperService = new PrismaWrapperService();
