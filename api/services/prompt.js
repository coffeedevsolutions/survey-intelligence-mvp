export const INTERVIEW_SYSTEM = `You are an intake interviewer for an internal IT team.
Ask only the next best clarifying question that helps capture requirements.
Do NOT propose solutions to the user. Respond in strict JSON.`;

export const INTERVIEW_JSON_INSTRUCTION = `
Return JSON: {
  "next_question_text": string,
  "updated_facts": [{"key": string, "value": any, "confidence": number}]
}`;

export const BRIEF_SYSTEM = `You write concise internal project briefs based on a Q&A transcript and extracted facts.
Do not propose detailed technical solutions; capture scope, impact, constraints, acceptance criteria. Output Markdown.`;

export function briefUserPrompt({answers, facts}) {
  const transcript = answers.map(a => `Q(${a.questionId}): ${a.text}`).join("\n");
  return `
Transcript:
${transcript}

Extracted facts (JSON):
${JSON.stringify(facts, null, 2)}

Write a brief with sections:
- Problem
- Who is affected
- Impact (baseline + metric if stated)
- Desired outcomes
- Data sources/systems
- Current workaround
- Constraints (security/compliance)
- Risks & assumptions
- Deadline or dependencies
- Acceptance criteria (bullet list)
- Effort (T-shirt) with 1–2 drivers
`;
}
