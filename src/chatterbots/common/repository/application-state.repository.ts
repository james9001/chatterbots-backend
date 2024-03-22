import * as Prisma from "@prisma/client";
import { characterRepository } from "../../generation/repository/character.repository";
import { loggingService } from "../service/logging.service";
import { prismaWrapperService } from "../service/prisma-wrapper.service";

export class ApplicationStateRepository {
	prisma = new Prisma.PrismaClient();

	public get = async (): Promise<ApplicationState> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const state = (await this.prisma.applicationState.findMany({ where: {} }))[0];
			return new ApplicationState(state);
		});
	};

	public update = async (state: ApplicationState, doValidation = true): Promise<void> => {
		if (doValidation) {
			const beforeUpdate = await this.get();
			if (
				state._status != ApplicationStateStatus.FREE &&
				beforeUpdate._status != ApplicationStateStatus.FREE &&
				doValidation
			) {
				throw new Error("Chatterbots Backend is already busy!");
			}
		}
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.applicationState.update({
				where: { id: state.id },
				data: {
					status: state._status,
					currentGenerationExecutionId: state.currentGenerationExecutionId,
					errorState: state.inErrorState,
					chatroomEnabled: state.isChatroomEnabled,
					charactersCurrentlyTyping: state.charactersCurrentlyTyping
						.map((characterCurrentlyTyping) => {
							return characterCurrentlyTyping.characterId + "";
						})
						.join(","),
				},
			});
		});
	};

	public onApplicationStart = async (): Promise<void> => {
		await prismaWrapperService.executePrismaFunction(async () => {
			const values = await this.prisma.applicationState.findMany({ where: {} });
			if (values.length == 1) {
				await loggingService.logAndPrint("application state found");
			} else if (values.length == 0) {
				await loggingService.logAndPrint("no application state found, creating");
				await this.prisma.applicationState.create({
					data: {
						status: "FREE",
						currentGenerationExecutionId: -1,
						errorState: false,
						chatroomEnabled: false,
						charactersCurrentlyTyping: "",
					},
				});
				await loggingService.logAndPrint("Finished creating application state");
			} else {
				throw new Error("There is more than one ApplicationState object in the DB");
			}
		});
		const characters = await characterRepository.getAll();
		for (const character of characters) {
			void character.registerMessageEventListener();
		}
	};

	public markAsErrorState = async (): Promise<void> => {
		const state = await this.get();
		state.inErrorState = true;
		await this.update(state, false);
	};
}

export const applicationStateRepository = new ApplicationStateRepository();

export class ApplicationState {
	public id: number;
	public _status: ApplicationStateStatus;
	public currentGenerationExecutionId: number;
	public inErrorState: boolean;
	public isChatroomEnabled: boolean;
	public charactersCurrentlyTyping: CharacterCurrentlyTyping[];

	constructor(model?: Prisma.ApplicationState) {
		if (model) {
			this.id = model.id;
			this._status = Object.entries(ApplicationStateStatus).find(([_key, val]) => {
				return val === model.status;
			})?.[1] as ApplicationStateStatus;
			this.currentGenerationExecutionId = model.currentGenerationExecutionId
				? model.currentGenerationExecutionId
				: -1;
			this.inErrorState = model.errorState;
			this.isChatroomEnabled = model.chatroomEnabled;
			//TODO: bug here - empty string gets parsed with the + operator into a zero, leading to a phantom CharacterCurrentlyTyping forever
			this.charactersCurrentlyTyping = model.charactersCurrentlyTyping
				.split(",")
				.map((characterIdAsString) => {
					return {
						characterId: +characterIdAsString,
					};
				});
		} else {
			this.id = -1;
			this._status = ApplicationStateStatus.FREE;
			this.currentGenerationExecutionId = -1;
			this.inErrorState = false;
			this.isChatroomEnabled = false;
			this.charactersCurrentlyTyping = [];
		}
	}
}

export enum ApplicationStateStatus {
	FREE = "FREE",
}

export interface CharacterCurrentlyTyping {
	characterId: number;
}
