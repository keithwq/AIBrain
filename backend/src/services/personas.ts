import * as fs from 'fs';
import * as path from 'path';
import { PERSONA_BASE } from '../config';

export const MIN_READY_SKILL_LINES = 5000;
/** 严格模式下：不满足 MIN_READY_SKILL_LINES 时，可用「语料包」规则（厚 SKILL + 厚 references）判 ready。 */
const CORPUS_SKILL_MIN = 2000;
const CORPUS_REFS_MIN = 4500;
const CORPUS_SUM_MIN = 6800;
const RELAX_READY_CHECK = process.env.RELAX_PERSONA_READY_CHECK !== 'false';
export function getPersonaSkillPath(expertId: string): string {
  return path.join(PERSONA_BASE, `${expertId}-perspective`, 'SKILL.md');
}

export function getPersonaResearchDir(expertId: string): string {
  return path.join(PERSONA_BASE, `${expertId}-perspective`, 'references', 'research');
}

export function countPersonaReferenceLines(expertId: string): number {
  const dir = getPersonaResearchDir(expertId);
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    try {
      const text = fs.readFileSync(path.join(dir, name), 'utf-8');
      total += text.split(/\r\n|\r|\n/).length;
    } catch {
      /* ignore */
    }
  }
  return total;
}

function isCorpusPackageReady(expertId: string): boolean {
  const skillLines = countPersonaSkillLines(expertId);
  const refLines = countPersonaReferenceLines(expertId);
  return (
    skillLines >= CORPUS_SKILL_MIN &&
    refLines >= CORPUS_REFS_MIN &&
    skillLines + refLines >= CORPUS_SUM_MIN
  );
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
  return getPersonaStatus(expertId) === 'ready';
}

export function getPersonaStatus(expertId: string): 'ready' | 'pending' {
  if (RELAX_READY_CHECK) return loadPersonaSkill(expertId) !== null ? 'ready' : 'pending';
  const skillLines = countPersonaSkillLines(expertId);
  if (skillLines >= MIN_READY_SKILL_LINES) return 'ready';
  if (isCorpusPackageReady(expertId)) return 'ready';
  return 'pending';
}
