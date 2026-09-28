import { createNativeDoor } from '../../src/lib/native-door.mjs';
import { game } from './game.mjs';

export const door = createNativeDoor(game);
