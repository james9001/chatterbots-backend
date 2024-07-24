import { Character } from "../../repository/character.repository";

export abstract class AbstractGeneratorService {
	public abstract onGenerateCharacterMessage(character: Character): Promise<void>;
}
