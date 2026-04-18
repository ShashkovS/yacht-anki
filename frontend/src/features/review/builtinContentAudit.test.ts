/*
This file checks repo-backed card semantics that are easy to regress in builtin content.
Edit this file when builtin card rules, supported templates, or deck counts change.
Copy this test style when you add another repo-level content audit.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getTack } from "../diagram/diagramHelpers";
import { parseDiagramSpec } from "../diagram/parser";
import type { DiagramSpec } from "../diagram/types";
import type { ReviewCard } from "../../shared/types";

type BuiltinDeckFile = {
  slug: string;
  cards: ReviewCard[];
};

function loadBuiltinDeck(filename: string): BuiltinDeckFile {
  const currentFile = fileURLToPath(import.meta.url);
  const repoFilePath = path.resolve(path.dirname(currentFile), "../../../../content", filename);
  return JSON.parse(fs.readFileSync(repoFilePath, "utf8")) as BuiltinDeckFile;
}

function loadBuiltinDecks(): BuiltinDeckFile[] {
  return ["terms.json", "manoeuvres.json", "right-of-way.json"].map((filename) => loadBuiltinDeck(filename));
}

function getCard(deckSlug: string, cardSlug: string): ReviewCard {
  const deck = loadBuiltinDecks().find((entry) => entry.slug === deckSlug);
  if (!deck) {
    throw new Error(`Deck ${deckSlug} not found.`);
  }
  const card = deck.cards.find((entry) => entry.slug === cardSlug);
  if (!card) {
    throw new Error(`Card ${deckSlug}:${cardSlug} not found.`);
  }
  return card;
}

function getDeck(deckSlug: string): BuiltinDeckFile {
  const deck = loadBuiltinDecks().find((entry) => entry.slug === deckSlug);
  if (!deck) {
    throw new Error(`Deck ${deckSlug} not found.`);
  }
  return deck;
}

function getBoatTack(spec: DiagramSpec, boatId: string): "port" | "starboard" | "head-to-wind" {
  const boat = spec.boats.find((entry) => entry.id === boatId);
  if (!boat) {
    throw new Error(`Boat ${boatId} not found.`);
  }
  return getTack(boat.heading_deg, spec.wind.direction_deg);
}

function getBoatProjection(spec: DiagramSpec, boatId: string): number {
  const boat = spec.boats.find((entry) => entry.id === boatId);
  if (!boat) {
    throw new Error(`Boat ${boatId} not found.`);
  }
  const radians = (boat.heading_deg * Math.PI) / 180;
  const forwardX = Math.sin(radians);
  const forwardY = -Math.cos(radians);
  return boat.x * forwardX + boat.y * forwardY;
}

function getBoat(spec: DiagramSpec, boatId: string) {
  const boat = spec.boats.find((entry) => entry.id === boatId);
  if (!boat) {
    throw new Error(`Boat ${boatId} not found.`);
  }
  return boat;
}

function getAnswerScene(spec: DiagramSpec): DiagramSpec {
  if (!spec.answer_scene) {
    throw new Error("Answer scene not found.");
  }
  return spec.answer_scene as DiagramSpec;
}

function getMarkSide(spec: DiagramSpec, boatId: string): number {
  if (!spec.mark) {
    throw new Error("Mark not found.");
  }
  const boat = getBoat(spec, boatId);
  const radians = (boat.heading_deg * Math.PI) / 180;
  const forwardX = Math.sin(radians);
  const forwardY = -Math.cos(radians);
  const toMarkX = spec.mark.x - boat.x;
  const toMarkY = spec.mark.y - boat.y;
  return forwardX * toMarkY - forwardY * toMarkX;
}

describe("builtin content audit", () => {
  it("keeps expected deck counts", () => {
    const decks = loadBuiltinDecks();

    expect(decks.map((deck) => deck.cards.length)).toEqual([35, 16, 23]);
  });

  it("keeps tack-definition cards aligned with the current tack helper", () => {
    const starboardCard = parseDiagramSpec(getCard("terms", "starboard-tack").diagram_spec);
    const portCard = parseDiagramSpec(getCard("terms", "port-tack").diagram_spec);

    expect(getBoatTack(starboardCard, "alpha")).toBe("starboard");
    expect(getBoatTack(portCard, "alpha")).toBe("port");
  });

  it("keeps rule 10 cards aligned with the port-tack boat", () => {
    const starboardOverPort = parseDiagramSpec(getCard("right-of-way", "rule10-starboard-over-port").diagram_spec);
    const portOverStarboard = parseDiagramSpec(getCard("right-of-way", "rule10-port-over-starboard").diagram_spec);

    expect(getBoatTack(starboardOverPort, "bravo")).toBe("port");
    expect(starboardOverPort.expected_answer?.type).toBe("select_boat");
    expect(starboardOverPort.expected_answer?.correct_boat_id).toBe("bravo");

    expect(getBoatTack(portOverStarboard, "alpha")).toBe("port");
    expect(portOverStarboard.expected_answer?.type).toBe("select_boat");
    expect(portOverStarboard.expected_answer?.correct_boat_id).toBe("alpha");
  });

  it("keeps the clear-astern port-tack card aligned with its geometry", () => {
    const spec = parseDiagramSpec(getCard("right-of-way", "rule12-clear-astern-port").diagram_spec);
    const asternBoatId = getBoatProjection(spec, "alpha") < getBoatProjection(spec, "bravo") ? "alpha" : "bravo";

    expect(asternBoatId).toBe("bravo");
    expect(spec.expected_answer?.type).toBe("select_boat");
    expect(spec.expected_answer?.correct_boat_id).toBe("bravo");
  });

  it("keeps mark and zone cards visually connected to at least one boat", () => {
    const markCardSlugs = ["mark-room-inside", "mark-room-outside-duty", "mark-room-no-overlap", "zone-awareness"];

    for (const slug of markCardSlugs) {
      const spec = parseDiagramSpec(getCard("right-of-way", slug).diagram_spec);
      expect(spec.mark).toBeTruthy();

      const boatInsideZone = spec.boats.some((boat) => {
        const dx = boat.x - spec.mark!.x;
        const dy = boat.y - spec.mark!.y;
        return Math.hypot(dx, dy) <= spec.mark!.zone_radius;
      });

      expect(boatInsideZone).toBe(true);
    }
  });

  it("keeps concept cards on choose-option answers instead of select-boat", () => {
    const conceptCards = loadBuiltinDecks().flatMap((deck) => deck.cards).filter((card) => card.template_type === "concept");

    expect(conceptCards.length).toBeGreaterThan(0);
    for (const card of conceptCards) {
      const spec = parseDiagramSpec(card.diagram_spec);
      expect(spec.expected_answer?.type).toBe("choose_option");
    }
  });

  it("keeps windward and leeward term cards spoiler-free until reveal", () => {
    const windwardSpec = parseDiagramSpec(getCard("terms", "windward-boat").diagram_spec);
    const leewardSpec = parseDiagramSpec(getCard("terms", "leeward-boat").diagram_spec);

    expect(windwardSpec.overlays).toBeUndefined();
    expect(leewardSpec.overlays).toBeUndefined();

    expect(getBoat(getAnswerScene(windwardSpec), "alpha").highlight).toBe("answer");
    expect(getBoat(getAnswerScene(windwardSpec), "bravo").highlight).toBeUndefined();

    expect(getBoat(getAnswerScene(leewardSpec), "alpha").highlight).toBeUndefined();
    expect(getBoat(getAnswerScene(leewardSpec), "bravo").highlight).toBe("answer");
  });

  it("keeps the reviewed terms cards on the intended sail trim states", () => {
    const levyentic = parseDiagramSpec(getCard("terms", "levyentic").diagram_spec);
    const headUpBroadReach = parseDiagramSpec(getCard("terms", "head-up-broad-reach").diagram_spec);
    const bearAwayBasic = parseDiagramSpec(getCard("terms", "bear-away-basic").diagram_spec);
    const bearAwayCloseReach = parseDiagramSpec(getCard("terms", "bear-away-close-reach").diagram_spec);
    const bearAwayPortTack = parseDiagramSpec(getCard("terms", "bear-away-port-tack").diagram_spec);

    expect(getBoat(levyentic, "alpha").sails.main.state).toBe("luffing");

    expect(getBoat(headUpBroadReach, "alpha").sails.main.state).toBe("eased");
    expect(getBoat(headUpBroadReach, "alpha").sails.jib?.state).toBe("eased");

    expect(getBoat(getAnswerScene(bearAwayBasic), "alpha").sails.jib?.state).toBe("eased");
    expect(getBoat(getAnswerScene(bearAwayCloseReach), "alpha").sails.jib?.state).toBe("eased");
    expect(getBoat(getAnswerScene(bearAwayPortTack), "alpha").sails.jib?.state).toBe("eased");
  });

  it("keeps reviewed manoeuvre cards aligned with their intended trim and non-duplicated text", () => {
    const gennakerHoist = parseDiagramSpec(getCard("manoeuvres", "gennaker-hoist-steps").diagram_spec);
    const duplicateTextSlugs = [
      "tack-steps",
      "gybe-steps",
      "gennaker-hoist-steps",
      "gennaker-drop-steps",
      "traveller-vs-sheet-steps",
      "heavy-air-flattening",
      "reefing-steps",
      "mark-rounding-bear-away",
    ];

    expect(getBoat(gennakerHoist, "alpha").sails.jib?.state).toBe("eased");

    for (const slug of duplicateTextSlugs) {
      const card = getCard("manoeuvres", slug);
      expect(card.answer).not.toBe(card.explanation);
    }
  });

  it("keeps goosewing visually distinct from a plain run", () => {
    const goosewing = parseDiagramSpec(getCard("terms", "goosewing").diagram_spec);
    const boat = getBoat(goosewing, "alpha");
    const mainAngle = boat.sails.main.angle_deg;
    const jibAngle = boat.sails.jib?.angle_deg;

    expect(typeof mainAngle).toBe("number");
    expect(typeof jibAngle).toBe("number");
    expect((mainAngle as number) * (jibAngle as number)).toBeLessThan(0);
  });

  it("keeps the right-of-way deck in the intended beginner-friendly order", () => {
    const expectedOrder = [
      "rule14-avoid-contact",
      "keep-clear-basic",
      "windward-identify",
      "leeward-identify",
      "overlap-basic",
      "clear-ahead",
      "clear-astern",
      "rule10-starboard-over-port",
      "rule10-port-over-starboard",
      "rule11-windward-leeward",
      "rule11-windward-leeward-port",
      "rule12-clear-astern",
      "rule12-clear-astern-port",
      "rule13-tacking",
      "rule15-acquiring-row",
      "rule16-course-change",
      "zone-awareness",
      "mark-room-inside",
      "mark-room-outside-duty",
      "mark-room-no-overlap",
      "opposite-tacks-at-mark",
      "rule18-2d-late-overlap",
      "rule18-3-tacking-in-zone",
    ];
    const deck = getDeck("right-of-way");
    const actualOrder = [...deck.cards]
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((card) => card.slug);

    expect(actualOrder).toEqual(expectedOrder);
  });

  it("keeps question-scene overlays hidden on right-of-way quiz cards except the legend card", () => {
    const hiddenOverlaySlugs = [
      "rule10-starboard-over-port",
      "rule10-port-over-starboard",
      "rule11-windward-leeward",
      "rule11-windward-leeward-port",
      "rule12-clear-astern",
      "rule12-clear-astern-port",
      "rule13-tacking",
      "windward-identify",
      "leeward-identify",
      "overlap-basic",
      "mark-room-inside",
      "mark-room-outside-duty",
      "mark-room-no-overlap",
      "opposite-tacks-at-mark",
      "rule15-acquiring-row",
      "rule16-course-change",
      "rule18-2d-late-overlap",
      "rule18-3-tacking-in-zone",
    ];

    for (const slug of hiddenOverlaySlugs) {
      const spec = parseDiagramSpec(getCard("right-of-way", slug).diagram_spec);
      expect(spec.overlays).toBeUndefined();
    }

    const keepClearCards = getDeck("right-of-way").cards.filter((card) => {
      const spec = parseDiagramSpec(card.diagram_spec);
      return spec.overlays?.keep_clear_boat_id;
    });

    expect(keepClearCards.map((card) => card.slug)).toEqual(["keep-clear-basic"]);
  });

  it("keeps history-dependent right-of-way rules as concept choose-option cards", () => {
    const slugs = [
      "rule15-acquiring-row",
      "rule16-course-change",
      "rule18-2d-late-overlap",
      "rule18-3-tacking-in-zone",
    ];

    for (const slug of slugs) {
      const card = getCard("right-of-way", slug);
      const spec = parseDiagramSpec(card.diagram_spec);

      expect(card.template_type).toBe("concept");
      expect(spec.expected_answer?.type).toBe("choose_option");
    }
  });

  it("keeps the mark-room approach cards on the same starboard side of the mark", () => {
    const inside = parseDiagramSpec(getCard("right-of-way", "mark-room-inside").diagram_spec);
    const outside = parseDiagramSpec(getCard("right-of-way", "mark-room-outside-duty").diagram_spec);

    expect(getMarkSide(inside, "alpha")).toBeGreaterThan(0);
    expect(getMarkSide(inside, "bravo")).toBeGreaterThan(0);
    expect(getBoat(inside, "alpha").y).toBeGreaterThan(getBoat(inside, "bravo").y);

    expect(getMarkSide(outside, "alpha")).toBeGreaterThan(0);
    expect(getMarkSide(outside, "bravo")).toBeGreaterThan(0);
    expect(getBoat(outside, "alpha").y).toBeGreaterThan(getBoat(outside, "bravo").y);
  });
});
