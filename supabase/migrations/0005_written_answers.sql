-- Knowra Phase 4D: store free-text (written) answers on attempt_answers.
-- MCQ/multi answers use the index arrays; written answers use these text
-- columns (index arrays stay empty for them). Additive and nullable.

alter table public.attempt_answers
  add column if not exists written_answer text,
  add column if not exists reference_answer text;
