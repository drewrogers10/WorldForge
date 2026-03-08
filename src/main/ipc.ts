import { ipcMain } from 'electron';
import type { CharacterService } from '@backend/services/character-service';
import {
  ipcContracts,
  type IpcContractKey,
  type IpcInput,
  type IpcOutput,
} from '@shared/ipc';

function registerHandler<K extends IpcContractKey>(
  key: K,
  handler: (input: IpcInput<K>) => IpcOutput<K> | Promise<IpcOutput<K>>,
): void {
  const contract = ipcContracts[key];

  ipcMain.handle(contract.channel, async (_event, rawInput) => {
    const input = contract.input.parse(rawInput) as IpcInput<K>;
    const output = await handler(input);
    return contract.output.parse(output) as IpcOutput<K>;
  });
}

export function registerIpcHandlers(
  characterService: CharacterService,
): void {
  registerHandler('listCharacters', () => characterService.listCharacters());
  registerHandler('getCharacter', (input) => characterService.getCharacter(input));
  registerHandler('createCharacter', (input) =>
    characterService.createCharacter(input),
  );
  registerHandler('updateCharacter', (input) =>
    characterService.updateCharacter(input),
  );
}
