import { ValueObject } from "../../../../shared/domain/value-object.js";
import { WorldDomainError } from "../errors/world.errors.js";


interface WorldNameProps {
    value: string;
}

export class WorldName extends ValueObject<WorldNameProps> {
    private constructor (props: WorldNameProps) {
        super(props);
    }

    static create(raw: string): WorldName {
        const value = raw.trim();

        if (value.length < 3 || value.length > 50) {
            throw new WorldDomainError(
                'INVALID_WORLD_NAME',
                'World name must be between 3 and 50 characters',
            );
        }

        return new WorldName({ value });
    }

    get value(): string {
        return this.props.value;
    }
}