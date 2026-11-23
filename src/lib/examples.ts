// Example utterances → expected intents. The test cases for every AssistantEngine
// (scripted now, Claude-backed later). Add a line here whenever the demo needs to understand something new.
import type { AssistantContext, Intent } from './assistant';

export interface Example {
  text: string;
  context: AssistantContext;
  expected: Intent;
}

const SEP_2027 = { year: 2027, month: 9 };
const start: AssistantContext = { stage: 'start' };
const askTrip: AssistantContext = { stage: 'askTrip' };
const askBudget: AssistantContext = { stage: 'askBudget', target: SEP_2027 };
const plan: AssistantContext = { stage: 'plan', target: SEP_2027 };

export const EXAMPLES: Example[] = [
  // Starting a goal
  {
    text: "I'm planning a trip to Japan for two in September 2027 and want to start saving for it.",
    context: start,
    expected: { kind: 'startTrip', destination: 'Japan', people: 2, target: SEP_2027 },
  },
  { text: 'Save for a trip', context: start, expected: { kind: 'startTrip' } },
  { text: 'Japan, for two, in September 2027', context: askTrip, expected: { kind: 'startTrip', destination: 'Japan', people: 2, target: SEP_2027 } },
  { text: 'Lisbon in May 2027 with my partner', context: askTrip, expected: { kind: 'startTrip', destination: 'Lisbon', people: 2, target: { year: 2027, month: 5 } } },
  { text: 'Transfer money', context: start, expected: { kind: 'unknown' } },
  { text: 'Block card', context: start, expected: { kind: 'unknown' } },

  // Budget question
  { text: '3.000 €', context: askBudget, expected: { kind: 'setGoal', amount: 3000 } },
  { text: 'About 3k', context: askBudget, expected: { kind: 'setGoal', amount: 3000 } },
  { text: 'Other amount', context: askBudget, expected: { kind: 'enterAmount' } },
  { text: 'Help me estimate', context: askBudget, expected: { kind: 'unknown' } },

  // Changing the plan: amounts, dates, fixed monthly
  { text: 'Make it 4.000', context: plan, expected: { kind: 'setGoal', amount: 4000 } },
  { text: 'make it 4.000 €', context: plan, expected: { kind: 'setGoal', amount: 4000 } },
  { text: '4000 €', context: plan, expected: { kind: 'setGoal', amount: 4000 } },
  { text: 'Update the budget to 4000', context: plan, expected: { kind: 'setGoal', amount: 4000 } },
  { text: 'in October', context: plan, expected: { kind: 'setTarget', target: { year: 2027, month: 10 } } },
  { text: 'by December', context: plan, expected: { kind: 'setTarget', target: { year: 2027, month: 12 } } },
  { text: 'Can we push it to October 2028?', context: plan, expected: { kind: 'setTarget', target: { year: 2028, month: 10 } } },
  { text: 'I can only do 120 a month', context: plan, expected: { kind: 'setMonthly', amount: 120 } },
  { text: 'only 120 a month', context: plan, expected: { kind: 'setMonthly', amount: 120 } },
  { text: '200 €/month', context: plan, expected: { kind: 'setMonthly', amount: 200 } },

  // Suggestions and questions
  { text: 'Reach it sooner', context: plan, expected: { kind: 'reachSooner' } },
  { text: 'Can I get there faster?', context: plan, expected: { kind: 'reachSooner' } },
  { text: 'Use my Christmas allowance', context: plan, expected: { kind: 'applySuggestion', id: 'christmas' } },
  { text: 'Set a budget for eating out', context: plan, expected: { kind: 'applySuggestion', id: 'eatingOut' } },
  { text: 'Remind me about Netflix', context: plan, expected: { kind: 'applySuggestion', id: 'netflix' } },
  { text: 'Why?', context: plan, expected: { kind: 'why' } },
  { text: 'Why 150 €?', context: plan, expected: { kind: 'why' } },
  { text: 'Approve', context: plan, expected: { kind: 'review' } },

  // Out of scope
  { text: 'Invite partner', context: { stage: 'approved', target: SEP_2027 }, expected: { kind: 'unknown' } },
  { text: 'What is the weather in Tokyo?', context: plan, expected: { kind: 'unknown' } },
];
