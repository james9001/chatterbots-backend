import { Request } from "express";

export interface SearchCriteria {
	pageSize: number;
	pageNumber: number;
}

export interface SearchPage {
	pageSize: number;
	pageNumber: number;
	totalElements: number;
}

export interface SearchResponse<T> {
	data: Array<T>;
	page: SearchPage;
}

export interface EntityRepository {
	getById(idToGet: number): Promise<Entity>;
	search(criteria: SearchCriteria): Promise<Entity[]>;
	count(criteria: SearchCriteria): Promise<number>;
	getAll(): Promise<Entity[]>;
	deletee(idToDelete: number): Promise<void>;
	update(entity: Entity): Promise<void>;
	create(entity: Entity): Promise<Entity>;
}

export interface ViewRouterInternal {
	postCreate(req: Request): Promise<EntityView>;
	put(req: Request): Promise<void>;
	delete(req: Request): Promise<void>;
	getAll(): Promise<EntityView[]>;
	get(req: Request): Promise<EntityView>;
	postSearch(req: Request): Promise<SearchResponse<EntityView>>;
	transformModelToView(model: Entity): Promise<EntityView>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Entity {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityView {}
