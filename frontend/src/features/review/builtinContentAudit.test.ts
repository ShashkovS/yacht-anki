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
});
