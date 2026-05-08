import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('openai', () => {
  class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  }
  return { default: MockOpenAI };
});

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
  it('returns skill body without YAML frontmatter', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('---\nid: steve-jobs\n---\n# Steve Jobs\n\nYou are Steve Jobs.');

    const result = buildSystemPrompt('steve-jobs');

    expect(result).toBe('# Steve Jobs\n\nYou are Steve Jobs.');
  });

  it('returns full content when no frontmatter', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('# Steve Jobs\n\nDirect content.');

    const result = buildSystemPrompt('steve-jobs');

    expect(result).toBe('# Steve Jobs\n\nDirect content.');
  });

  it('returns fallback prompt when skill not found', () => {
    mockedFs.existsSync.mockReturnValue(false);

    const result = buildSystemPrompt('nonexistent');

    expect(result).toBe('You are a helpful AI assistant.');
  });
});
