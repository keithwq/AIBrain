import * as fs from 'fs';
import * as path from 'path';
import { PERSONA_BASE } from '../config';

export const MIN_READY_SKILL_LINES = 5000;
const RELAX_READY_CHECK = process.env.RELAX_PERSONA_READY_CHECK !== 'false';

export function getPersonaSkillPath(expertId: string): string {
  return path.join(PERSONA_BASE, `${expertId}-perspective`, 'SKILL.md');
}

export function loadPersonaSkill(expertId: string): string | null {
  const skillPath = getPersonaSkillPath(expertId);
  try {
    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, 'utf-8');
    }
  } catch (err) {
    console.warn(`Failed to load skill for "${expertId}":`, err);
  }
  return null;
}

export function countPersonaSkillLines(expertId: string): number {
  const skill = loadPersonaSkill(expertId);
  if (!skill) return 0;
  return skill.split(/\r\n|\r|\n/).length;
}

export function isPersonaReady(expertId: string): boolean {
  if (RELAX_READY_CHECK) return loadPersonaSkill(expertId) !== null;
  return countPersonaSkillLines(expertId) >= MIN_READY_SKILL_LINES;
}

export function getPersonaStatus(expertId: string): 'ready' | 'pending' {
  if (RELAX_READY_CHECK) return loadPersonaSkill(expertId) !== null ? 'ready' : 'pending';
  return countPersonaSkillLines(expertId) >= MIN_READY_SKILL_LINES ? 'ready' : 'pending';
}
