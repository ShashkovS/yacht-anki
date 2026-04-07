/*
This file renders the current review card, answer reveal state, and template-specific UI.
Edit this file when review card layout, template interactions, or answer reveal rules change.
Copy this file when you add another review-only presentation component.
*/

import { ResponsiveDiagram, parseDiagramSpec } from "../diagram";
import type { DiagramSpec } from "../diagram/types";
import { buildAnswerScene, buildQuestionScene, getExpectedAnswer } from "./reviewCardHelpers";
import type { ReviewCard } from "../../shared/types";

type ReviewCardViewProps = {
  card: ReviewCard;
  revealed: boolean;
  draftHeading: number | null;
  selectedBoatId: string | null;
  selectedOptionId: string | null;
  onRotateBoat: (boatId: string, headingDeg: number) => void;
  onTapBoat: (boatId: string) => void;
  onSelectOption: (optionId: string) => void;
};

function tryParseDiagramSpec(diagramSpec: unknown): DiagramSpec | null {
  try {
    return parseDiagramSpec(diagramSpec);
  } catch {
    return null;
  }
}

export function ReviewCardView({
  card,
  revealed,
  draftHeading,
  selectedBoatId,
  selectedOptionId,
  onRotateBoat,
  onTapBoat,
  onSelectOption,
}: ReviewCardViewProps) {
  const parsedSpec = tryParseDiagramSpec(card.diagram_spec);
  const expectedAnswer = getExpectedAnswer(card, parsedSpec);
  const displayedSpec = parsedSpec ? (revealed ? buildAnswerScene(parsedSpec) : buildQuestionScene(parsedSpec, draftHeading, selectedBoatId)) : card.diagram_spec;

  return (
    <div className="space-y-5">
      <ResponsiveDiagram
        className="w-full"
        diagramSpec={displayedSpec}
        minHeight={320}
        rotatableBoatId={!revealed && expectedAnswer?.type === "rotate_heading" ? expectedAnswer.boat_id : undefined}
        onBoatRotate={onRotateBoat}
        onBoatTap={!revealed && expectedAnswer?.type === "select_boat" ? onTapBoat : undefined}
      />

      {!revealed && card.template_type === "directional" ? (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">Поверните лодку в правильное положение, затем откройте ответ.</p>
      ) : null}

      {!revealed && card.template_type === "trim" && expectedAnswer?.type === "choose_option" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {expectedAnswer.options.map((option) => (
            <button
              key={option.id}
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                selectedOptionId === option.id
                  ? "border-teal-700 bg-teal-50 text-teal-950"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
              }`}
              onClick={() => onSelectOption(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {!revealed && card.template_type === "right_of_way" ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">Коснитесь лодки, которая должна сторониться, затем откройте ответ.</p>
      ) : null}

      {revealed ? (
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-emerald-200/90 bg-emerald-50/90 p-5">
            <h3 className="text-lg font-semibold text-slate-950">Ответ</h3>
            <p className="mt-2 text-sm leading-7 text-slate-800">{card.answer}</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{card.explanation}</p>
          </div>

          {expectedAnswer?.type === "rotate_heading" ? (
            <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              Правильный курс: <strong>{Math.round(expectedAnswer.heading_deg)}°</strong> относительно сцены.
            </p>
          ) : null}

          {expectedAnswer?.type === "choose_option" ? (
            <div className="rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
              <p>
                Правильный вариант:{" "}
                <strong>{expectedAnswer.options.find((option) => option.id === expectedAnswer.correct_option_id)?.label ?? expectedAnswer.correct_option_id}</strong>
              </p>
              {selectedOptionId ? <p className="mt-2">Ваш выбор: {expectedAnswer.options.find((option) => option.id === selectedOptionId)?.label ?? selectedOptionId}</p> : null}
            </div>
          ) : null}

          {expectedAnswer?.type === "select_boat" ? (
            <div className="rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
              <p>
                Правильная лодка: <strong>{expectedAnswer.correct_boat_id}</strong>
              </p>
              {selectedBoatId ? <p className="mt-2">Ваш выбор: {selectedBoatId}</p> : null}
            </div>
          ) : null}

          {expectedAnswer?.type === "reveal_steps" ? (
            <ol className="rounded-2xl bg-slate-100 px-6 py-4 text-sm leading-7 text-slate-700">
              {expectedAnswer.steps.map((step, index) => (
                <li key={step} className="list-decimal">
                  <strong className="text-slate-900">{index + 1}.</strong> {step}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
