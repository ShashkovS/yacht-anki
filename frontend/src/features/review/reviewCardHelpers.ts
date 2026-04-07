/*
This file holds pure helpers for phase-05 review UI templates and deck status labels.
Edit this file when review card presentation or card-status mapping changes.
Copy this file when you add another small pure helper for the review feature.
*/

import type { CardPhase, ReviewCard } from "../../shared/types";
import type { DiagramSpec, ExpectedAnswer } from "../diagram/types";

function toScene(spec: DiagramSpec): Omit<DiagramSpec, "answer_scene" | "expected_answer"> {
  return {
    version: spec.version,
    wind: spec.wind,
    boats: spec.boats,
    mark: spec.mark,
    overlays: spec.overlays,
  };
}

function cloneScene(scene: Omit<DiagramSpec, "answer_scene" | "expected_answer">): Omit<DiagramSpec, "answer_scene" | "expected_answer"> {
  return {
    version: scene.version,
    wind: { ...scene.wind },
    boats: scene.boats.map((boat) => ({
      ...boat,
      sails: {
        main: { ...boat.sails.main },
        jib: boat.sails.jib ? { ...boat.sails.jib } : undefined,
        gennaker: boat.sails.gennaker ? { ...boat.sails.gennaker } : undefined,
      },
    })),
    mark: scene.mark ? { ...scene.mark } : undefined,
    overlays: scene.overlays
      ? {
          ...scene.overlays,
          overlap_pairs: scene.overlays.overlap_pairs?.map((pair) => ({ ...pair })),
        }
      : undefined,
  };
}

function highlightBoat(
  scene: Omit<DiagramSpec, "answer_scene" | "expected_answer">,
  boatId: string,
  highlight: "selected" | "answer",
): Omit<DiagramSpec, "answer_scene" | "expected_answer"> {
  return {
    ...scene,
    boats: scene.boats.map((boat) => ({
      ...boat,
      highlight: boat.id === boatId ? highlight : boat.highlight === "answer" || boat.highlight === "selected" ? "none" : boat.highlight,
    })),
  };
}

function rotateBoat(
  scene: Omit<DiagramSpec, "answer_scene" | "expected_answer">,
  boatId: string,
  headingDeg: number,
): Omit<DiagramSpec, "answer_scene" | "expected_answer"> {
  return {
    ...scene,
    boats: scene.boats.map((boat) => (boat.id === boatId ? { ...boat, heading_deg: headingDeg } : boat)),
  };
}

export function buildQuestionScene(spec: DiagramSpec, draftHeading: number | null, selectedBoatId: string | null): DiagramSpec {
  let scene = cloneScene(toScene(spec));
  if (spec.expected_answer?.type === "rotate_heading" && draftHeading !== null) {
    scene = rotateBoat(scene, spec.expected_answer.boat_id, draftHeading);
  }
  if (spec.expected_answer?.type === "select_boat" && selectedBoatId) {
    scene = highlightBoat(scene, selectedBoatId, "selected");
  }
  return scene;
}

export function buildAnswerScene(spec: DiagramSpec): DiagramSpec {
  if (spec.answer_scene) {
    return spec.answer_scene;
  }

  const scene = cloneScene(toScene(spec));
  const expected = spec.expected_answer;
  if (!expected) {
    return scene;
  }
  if (expected.type === "rotate_heading") {
    return rotateBoat(scene, expected.boat_id, expected.heading_deg);
  }
  if (expected.type === "select_boat") {
    return highlightBoat(scene, expected.correct_boat_id, "answer");
  }
  return scene;
}

export function getCardStatusLabel(phase: CardPhase | null | undefined): string {
  if (!phase || phase === "new") {
    return "Новая";
  }
  if (phase === "learning" || phase === "relearning") {
    return "Изучается";
  }
  return "На повторении";
}

export function getExpectedAnswer(card: ReviewCard, parsedSpec: DiagramSpec | null): ExpectedAnswer | null {
  if (!parsedSpec?.expected_answer) {
    return null;
  }
  if (card.template_type === "directional" && parsedSpec.expected_answer.type === "rotate_heading") {
    return parsedSpec.expected_answer;
  }
  if (card.template_type === "trim" && parsedSpec.expected_answer.type === "choose_option") {
    return parsedSpec.expected_answer;
  }
  if (card.template_type === "manoeuvre" && parsedSpec.expected_answer.type === "reveal_steps") {
    return parsedSpec.expected_answer;
  }
  if (card.template_type === "right_of_way" && parsedSpec.expected_answer.type === "select_boat") {
    return parsedSpec.expected_answer;
  }
  return null;
}
