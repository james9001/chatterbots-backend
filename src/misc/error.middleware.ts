import { Prisma } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
	error: any,
	request: Request,
	response: Response,
	next: NextFunction
) => {
	console.log("ERROR!");
	console.log(error);

	if (error instanceof Prisma.PrismaClientValidationError) {
		response.status(400).send(error.message);
		return;
	}
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.message.indexOf("Foreign key constraint failed") > -1) {
			response.status(400).send(error.message);
			return;
		}
	}
	if (error instanceof GenericBadRequestError) {
		response.status(400).send(error.name + ": " + error.message);
		return;
	}

	response.status(500).send(error.message);
};

export class GenericBadRequestError implements Error {
	public name: string;
	public message: string;

	constructor(name: string, message: string) {
		this.name = name;
		this.message = message;
	}
}
