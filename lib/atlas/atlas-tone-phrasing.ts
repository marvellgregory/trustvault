import type {
  AtlasIssueCategory,
  AtlasToneMetadata,
} from "./atlas-types.js";

export type AtlasTonePhrasingInput = {
  answer: string;
  tone: AtlasToneMetadata;
  issueCategory: AtlasIssueCategory;
};

export function applyAtlasTonePhrasing(
  input: AtlasTonePhrasingInput,
): string {
  const answer = input.answer.trim();

  if (
    !answer ||
    input.tone.mode !== "playful" ||
    input.tone.humourAllowed !== true
  ) {
    return answer;
  }

  if (input.issueCategory === "gift-vault") {
    return `${answer} A little planning can make the surprise land just right.`;
  }

  if (input.issueCategory === "bill-split") {
    return `${answer} Less "who still owes what?" detective work.`;
  }

  if (input.issueCategory === "business") {
    return `${answer} I'll keep the jargon on a short leash.`;
  }

  if (input.issueCategory === "general") {
    return `${answer} We can keep it simple from here.`;
  }

  return answer;
}
