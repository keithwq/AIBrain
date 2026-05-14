import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('openai', () => {
  class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  }
  return { default: MockOpenAI };
});

vi.mock('../../config', () => ({ PERSONA_BASE: '/mock/personas', WIKI_BASE: '/mock/personas' }));

vi.mock('fs');
vi.mock('path');

const mockedFs = vi.mocked(fs);
const mockedPath = vi.mocked(path);

let loadSkill: (id: string) => string;
let buildSystemPrompt: (id: string) => string;

beforeEach(async () => {
  vi.clearAllMocks();
  mockedPath.join.mockImplementation((...args) => args.join('/'));
  const mod = await import('../deepseek');
  loadSkill = mod.loadSkill;
  buildSystemPrompt = mod.buildSystemPrompt;
});

describe('loadSkill', () => {
  it('returns file content when SKILL.md exists', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('# Mingheng Fawu Skill\n\nSome content');

    const result = loadSkill('mingheng-fawu');

    expect(result).toBe('# Mingheng Fawu Skill\n\nSome content');
    expect(mockedFs.existsSync).toHaveBeenCalled();
    expect(mockedFs.readFileSync).toHaveBeenCalled();
  });

  it('returns empty string when SKILL.md does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);

    const result = loadSkill('nonexistent');

    expect(result).toBe('');
  });

  it('returns empty string on error', () => {
    mockedFs.existsSync.mockImplementation(() => { throw new Error('permission denied'); });

    const result = loadSkill('error-case');

    expect(result).toBe('');
  });
});

describe('buildSystemPrompt', () => {
  it('includes skill body without YAML frontmatter and expert protocol', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('---\nid: mingheng-fawu\n---\n# Mingheng Fawu\n\nYou are Mingheng Fawu.');

    const result = buildSystemPrompt('mingheng-fawu');

    expect(result).toContain('# Mingheng Fawu\n\nYou are Mingheng Fawu.');
    expect(result).toContain('Mingheng Fawu');
    expect(result.length).toBeGreaterThan(100);
  });

  it('includes full content when no frontmatter', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('# Mingheng Fawu\n\nDirect content.');

    const result = buildSystemPrompt('mingheng-fawu');

    expect(result).toContain('# Mingheng Fawu\n\nDirect content.');
    expect(result).toContain('Mingheng Fawu');
  });

  it('uses fallback prompt and default protocol when skill not found', () => {
    mockedFs.existsSync.mockReturnValue(false);

    const result = buildSystemPrompt('nonexistent');

    expect(result.length).toBeGreaterThan(0);
  });
});
