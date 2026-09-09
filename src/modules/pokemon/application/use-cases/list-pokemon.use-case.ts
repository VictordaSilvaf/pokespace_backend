import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import {
  POKEMON_REPOSITORY,
  type PokemonRepository,
} from '../../domain/repositories/pokemon.repository.js';
import { toPokemonResult, type ListPokemonResult } from '../dto/pokemon.dto.js';

@Injectable()
export class ListPokemonUseCase implements UseCase<void, ListPokemonResult> {
  constructor(
    @Inject(POKEMON_REPOSITORY)
    private readonly pokemonRepository: PokemonRepository,
  ) {}

  async execute(): Promise<ListPokemonResult> {
    const pokemon = await this.pokemonRepository.listActive();
    return pokemon.map((p) => toPokemonResult(p));
  }
}
