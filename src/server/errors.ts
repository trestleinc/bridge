export class BridgeError extends Error {
	readonly code: string;

	constructor(message: string, code: string) {
		super(message);
		this.name = "BridgeError";
		this.code = code;
	}
}

export class NotFoundError extends BridgeError {
	constructor(resource: string, id: string) {
		super(`${resource} not found: ${id}`, "NOT_FOUND");
		this.name = "NotFoundError";
	}
}

export class ValidationError extends BridgeError {
	readonly fields: { field: string; message: string }[];

	constructor(message: string, fields: { field: string; message: string }[] = []) {
		super(message, "VALIDATION_ERROR");
		this.name = "ValidationError";
		this.fields = fields;
	}
}

export class AuthorizationError extends BridgeError {
	constructor(message = "Not authorized") {
		super(message, "UNAUTHORIZED");
		this.name = "AuthorizationError";
	}
}

export class ConflictError extends BridgeError {
	constructor(message: string) {
		super(message, "CONFLICT");
		this.name = "ConflictError";
	}
}
