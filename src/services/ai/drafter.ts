import { AgentService } from "./agent";
import { useRoleStore } from "../../stores/roleStore";

export const DrafterService = {
  /**
   * The Micro-Loop: Writes ONE paragraph based on the current beat and context.
   */
  draftParagraph: async (
    beat: string,
    context: string,
    previousText: string, // The last few paragraphs drafted
  ): Promise<string> => {
    const roles = useRoleStore.getState().roles;
    const drafterRole = roles.find(
      (r) => r.id === "story_drafter",
    )?.systemPrompt;
    const editorRole = roles.find(
      (r) => r.id === "editor_in_chief",
    )?.systemPrompt;

    // 1. Drafting Step
    const draftPrompt = `
    CONTEXT:
    ${context}

    PREVIOUS TEXT:
    "${previousText.slice(-500)}..."

    CURRENT BEAT TO WRITE:
    "${beat}"

    Write the next paragraph(s) for this beat. 
    Focus on Action and Dialogue. Show, Don't Tell.
    `;

    const draft = await AgentService.generateText({
      systemPrompt: drafterRole,
      userPrompt: draftPrompt,
    });

    // 2. Editor Review Step (Micro-Loop)
    const reviewPrompt = `
    Review this just-written paragraph for:
    1. Continuity errors with previous text.
    2. Passive voice or excessive narration (Show, Don't Tell).
    3. Cliches.

    Paragraph: "${draft}"

    If it's good, output "PASS".
    If it needs fixing, rewrite it solely to fix the issue, without commentary.
    `;

    const review = await AgentService.generateText({
      systemPrompt: editorRole,
      userPrompt: reviewPrompt,
    });

    if (review.trim().startsWith("PASS")) {
      return draft;
    } else {
      return review; // Return the edited version
    }
  },
};
