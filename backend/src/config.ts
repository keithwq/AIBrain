import * as path from 'path';

export const PERSONA_BASE =
  process.env.PERSONA_BASE_PATH ||
  process.env.WIKI_BASE_PATH ||
  path.resolve(process.cwd(), 'personas');

export const WIKI_BASE = PERSONA_BASE;
