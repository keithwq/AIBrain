import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    mockedFs.readFileSync.mockReturnValue('# Steve Jobs Skill\n\nSome content');

    const result = loadSkill('steve-jobs');

    expect(result).toBe('# Steve Jobs Skill\n\nSome content');
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
    mockedFs.readFileSync.mockReturnValue('---\nid: steve-jobs\n---\n# Steve Jobs\n\nYou are Steve Jobs.');

    const result = buildSystemPrompt('steve-jobs');

    expect(result).toContain('# Steve Jobs\n\nYou are Steve Jobs.');
    expect(result).toContain('当前外脑：乔大爷');
    expect(result).toContain('专家外脑');
  });

  it('includes full content when no frontmatter', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('# Steve Jobs\n\nDirect content.');

    const result = buildSystemPrompt('steve-jobs');

    expect(result).toContain('# Steve Jobs\n\nDirect content.');
    expect(result).toContain('功能取舍清单');
  });

  it('uses fallback prompt and default protocol when skill not found', () => {
    mockedFs.existsSync.mockReturnValue(false);

    const result = buildSystemPrompt('nonexistent');

    expect(result).toContain('你是一个有帮助的 AI 助手。');
    expect(result).toContain('当前外脑：外脑专家');
  });
});
