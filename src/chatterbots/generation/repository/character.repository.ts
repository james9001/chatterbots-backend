import * as Prisma from "@prisma/client";
import { prismaWrapperService } from "../../common/service/prisma-wrapper.service";
import { messageCoordinationService } from "../service/message-coordination.service";

export class CharacterRepository {
	prisma = new Prisma.PrismaClient();

	public getById = async (idToGet: number): Promise<Character> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const entity = await this.prisma.character.findUnique({
				where: { id: idToGet },
			});
			if (entity == null) {
				throw new Error("Does not exist");
			}
			return new Character(entity);
		});
	};

	public getAll = async (): Promise<Character[]> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const results = await this.prisma.character.findMany({});
			const models: Character[] = [];
			for (const result of results) {
				models.push(new Character(result));
			}
			return models;
		});
	};

	public deletee = async (idToDelete: number): Promise<void> => {
		const character = await this.getById(idToDelete);
		await messageCoordinationService.removeMessageEventListener(character);

		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.character.delete({
				where: { id: idToDelete },
			});
		});
	};

	public update = async (entity: Character): Promise<void> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			await this.prisma.character.update({
				where: { id: entity.id },
				data: {
					id: entity.id,
					name: entity.name,
					persona: entity.persona,
					greeting: entity.greeting,
					worldScenario: entity.worldScenario,
					isHuman: entity.isHuman,
					isEnabled: entity.isEnabled,

					updatedTime: "" + Date.now(),
				},
			});
		});
	};

	public create = async (entity: Character): Promise<Character> => {
		return prismaWrapperService.executePrismaFunction(async () => {
			const created = await this.prisma.character.create({
				data: {
					name: entity.name,
					persona: entity.persona,
					greeting: entity.greeting,
					worldScenario: entity.worldScenario,
					isHuman: entity.isHuman,
					isEnabled: entity.isEnabled,

					createdTime: "" + Date.now(),
					updatedTime: "" + Date.now(),
				},
			});

			const character = new Character(created);
			void messageCoordinationService.registerMessageEventListener(character);
			return character;
		});
	};
}

export const characterRepository = new CharacterRepository();

export class Character {
	public id: number;
	public createdTime: string;
	public updatedTime: string;

	public name: string;
	public persona: string;
	public greeting: string;
	public worldScenario: string;
	public isHuman: boolean;
	public isEnabled: boolean;

	constructor(model?: Prisma.Character) {
		if (model) {
			this.id = model.id;
			this.name = model.name;
			this.persona = model.persona;
			this.greeting = model.greeting;
			this.worldScenario = model.worldScenario;
			this.isHuman = model.isHuman;
			this.isEnabled = model.isEnabled;

			this.createdTime = model.createdTime as string;
			this.updatedTime = model.updatedTime as string;
		} else {
			this.id = -1;
			this.name = "";
			this.persona = "";
			this.greeting = "";
			this.worldScenario = "";
			this.isHuman = false;
			this.isEnabled = false;

			this.createdTime = "";
			this.updatedTime = "";
		}
	}
}
