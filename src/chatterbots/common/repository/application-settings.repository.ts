import * as Prisma from "@prisma/client";
import { loggingService } from "../service/logging.service";
import { prismaWrapperService } from "../service/prisma-wrapper.service";

export class ApplicationSettingsRepository {
	prisma = new Prisma.PrismaClient();

	public get = async (): Promise<ApplicationSettings> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const settings = (await this.prisma.applicationSettings.findMany({ where: {} }))[0];
			return new ApplicationSettings(settings);
		});
	};

	public update = async (settings: ApplicationSettings): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.applicationSettings.update({
				where: { id: settings.id },
				data: {
					promptMaxTokens: settings.promptMaxTokens,
					openAiCompatibleEndpoint: settings.openAiCompatibleEndpoint,
					currentHumanCharacterId: settings.currentHumanCharacterId,
				},
			});
		});
	};

	public onApplicationStart = async (): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const values = await this.prisma.applicationSettings.findMany({ where: {} });
			if (values.length == 1) {
				await loggingService.logAndPrint("application settings found");
			} else if (values.length == 0) {
				await loggingService.logAndPrint("no application settings found, creating");
				await this.prisma.applicationSettings.create({
					data: {
						promptMaxTokens: "",
						openAiCompatibleEndpoint: "",
						currentHumanCharacterId: -1,
					},
				});
				await loggingService.logAndPrint("Finished creating application settings");
			} else {
				throw new Error("There is more than one ApplicationSettings object in the DB");
			}
		});
	};
}

export const applicationSettingsRepository = new ApplicationSettingsRepository();

export class ApplicationSettings {
	public id: number;
	public promptMaxTokens: string;
	public openAiCompatibleEndpoint: string;
	public currentHumanCharacterId: number;

	constructor(model?: Prisma.ApplicationSettings) {
		if (model) {
			this.id = model.id;
			this.promptMaxTokens = model.promptMaxTokens ? model.promptMaxTokens : "";
			this.openAiCompatibleEndpoint = model.openAiCompatibleEndpoint;
			this.currentHumanCharacterId = model.currentHumanCharacterId
				? model.currentHumanCharacterId
				: -1;
		} else {
			this.id = -1;
			this.promptMaxTokens = "";
			this.openAiCompatibleEndpoint = "";
			this.currentHumanCharacterId = -1;
		}
	}
}
