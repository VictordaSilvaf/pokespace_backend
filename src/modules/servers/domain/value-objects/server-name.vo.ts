import { ValueObject } from "../../../../shared/domain/value-object.js";
import { ServerDomainError } from "../errors/server.errors.js";


interface ServerNameProps {
    value: string;
}

export class ServerName extends ValueObject<ServerNameProps> {
    private constructor (props: ServerNameProps) {
        super(props);
    }

    static create(raw: string): ServerName {
        const value = raw.trim();

        if (value.length < 3 || value.length > 50) {
            throw new ServerDomainError(
                'INVALID_SERVER_NAME',
                'server name must be between 3 and 50 characters',
            );
        }

        return new ServerName({ value });
    }

    get value(): string {
        return this.props.value;
    }
}