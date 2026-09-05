import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCommentBody } from '../../src/http/validation.js';

test('validateCommentBody accepts a complete comment and trims both fields', () => {
  const result = validateCommentBody({ author: '  Ana  ', content: '  Provider contacted.  ' });
  assert.deepEqual(result, { author: 'Ana', content: 'Provider contacted.' });
});

test('validateCommentBody rejects missing, empty and whitespace-only fields', () => {
  const invalidAuthors = [
    { author: undefined, content: 'texto' },
    { author: '', content: 'texto' },
    { author: '   ', content: 'texto' },
    { author: 42, content: 'texto' },
  ];
  for (const body of invalidAuthors) {
    assert.throws(() => validateCommentBody(body), /autor/i, `deveria recusar autor: ${JSON.stringify(body)}`);
  }

  const invalidContents = [
    { author: 'Ana', content: undefined },
    { author: 'Ana', content: '' },
    { author: 'Ana', content: '   ' },
    { author: 'Ana', content: 42 },
  ];
  for (const body of invalidContents) {
    assert.throws(() => validateCommentBody(body), /conteúdo/i, `deveria recusar conteúdo: ${JSON.stringify(body)}`);
  }

  assert.throws(() => validateCommentBody(null), /autor/i);
  assert.throws(() => validateCommentBody('texto solto'), /autor/i);
});
