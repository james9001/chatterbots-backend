import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";

export class CharacterMessageRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<CharacterMessage> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.characterMessage.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new CharacterMessage(entity);
		});
	};

	public getAll = async (): Promise<CharacterMessage[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.characterMessage.findMany({});
			const models: CharacterMessage[] = [];
			for (const result of results) {
				models.push(new CharacterMessage(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.characterMessage.delete({
				where: { id: idToDelete },
			});
		});
	};

	public deleteAll = async (): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.characterMessage.deleteMany({});
		});
	};

	public update = async (entity: CharacterMessage): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.characterMessage.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					recipientCharacterId: entity.recipientCharacterId,
					sendingCharacterId: entity.sendingCharacterId,
					message: entity.message,

					updatedTime: "" + Date.now(),
				},
			});
		});
	};

	public create = async (entity: CharacterMessage): Promise<CharacterMessage> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.characterMessage.create({
				data: {
					recipientCharacterId: entity.recipientCharacterId,
					sendingCharacterId: entity.sendingCharacterId,
					message: entity.message,

					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});
			return new CharacterMessage(created);
		});
	};
}

export const characterMessageRepository = new CharacterMessageRepository();

export class CharacterMessage {
	public id: number;

	public recipientCharacterId: number;
	public sendingCharacterId: number;
	public message: string;

	public createdTime: string;
	public updatedTime: string;

	constructor(model?: Prisma.CharacterMessage) {
		if (model) {
			this.id = model.id;
			this.recipientCharacterId = model.recipientCharacterId;
			this.sendingCharacterId = model.sendingCharacterId;
			this.message = model.message;

			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
		} else {
			this.id = -1;
			this.recipientCharacterId = -1;
			this.sendingCharacterId = -1;
			this.message = "";

			this.createdTime = "";
			this.updatedTime = "";
		}
	}
}
