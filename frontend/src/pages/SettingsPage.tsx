/*
This file shows the authenticated user settings form for spaced repetition limits.
Edit this file when settings form fields, save behavior, or validation copy changes.
Copy this file as a starting point when you add another authenticated settings form.
*/

import { useEffect, useMemo, useState } from "react";
import { postJson } from "../shared/api";
import type { UserSettings } from "../shared/types";

type SettingsFormState = {
  desiredRetention: number;
  newCardsPerDay: string;
  reviewsPerDay: string;
  unlimitedReviews: boolean;
};

function toFormState(settings: UserSettings): SettingsFormState {
  return {
    desiredRetention: settings.desired_retention,
    newCardsPerDay: String(settings.new_cards_per_day),
    reviewsPerDay: settings.reviews_per_day === null ? "" : String(settings.reviews_per_day),
    unlimitedReviews: settings.reviews_per_day === null,
  };
}

function parseNonNegativeInteger(rawValue: string, fieldLabel: string): number {
  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${fieldLabel} должен быть неотрицательным целым числом.`);
  }
  return Number(rawValue);
}

export function SettingsPage() {
  const [savedSettings, setSavedSettings] = useState<UserSettings | null>(null);
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    postJson<UserSettings>("/settings/get")
      .then((data) => {
        if (!cancelled) {
          setSavedSettings(data);
          setForm(toFormState(data));
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить настройки.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(() => {
    if (!savedSettings || !form) {
      return false;
    }
    return JSON.stringify(toFormState(savedSettings)) !== JSON.stringify(form);
  }, [form, savedSettings]);

  if (loading) {
    return <p className="text-slate-600">Загружаем настройки...</p>;
  }

  if (error && !form) {
    return <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5 text-rose-900">{error}</div>;
  }

  if (!form) {
    return <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-5 text-rose-900">Настройки недоступны.</div>;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    try {
      if (form.desiredRetention < 0.7 || form.desiredRetention > 0.97) {
        throw new Error("Целевой retention должен быть в диапазоне 0.70–0.97.");
      }

      const newCardsPerDay = parseNonNegativeInteger(form.newCardsPerDay, "Лимит новых карточек");
      const reviewsPerDay = form.unlimitedReviews ? null : parseNonNegativeInteger(form.reviewsPerDay, "Лимит повторений");

      setSaving(true);
      const saved = await postJson<UserSettings>("/settings/save", {
        desired_retention: Number(form.desiredRetention.toFixed(2)),
        new_cards_per_day: newCardsPerDay,
        reviews_per_day: reviewsPerDay,
      });
      setSavedSettings(saved);
      setForm(toFormState(saved));
      setSuccessMessage("Настройки сохранены.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить настройки.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-sky-950/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,118,110,0.9))] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm">FSRS и лимиты очереди</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Настройки</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-50/90">Здесь задаются целевой retention и ограничения на размер очереди. Новые значения применятся при следующей загрузке review.</p>
      </div>

      <form className="space-y-6 rounded-[2rem] border border-slate-200/80 bg-white/92 p-6 shadow-lg shadow-slate-200/60" onSubmit={onSubmit}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <label className="text-base font-semibold text-slate-950" htmlFor="desired-retention">
              Целевой retention
            </label>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">{form.desiredRetention.toFixed(2)}</span>
          </div>
          <input
            id="desired-retention"
            max="0.97"
            min="0.70"
            onChange={(event) => {
              setForm((current) => (current ? { ...current, desiredRetention: Number(event.target.value) } : current));
              setSuccessMessage("");
            }}
            step="0.01"
            type="range"
            value={form.desiredRetention}
          />
          <p className="text-sm leading-7 text-slate-600">Чем выше retention, тем чаще карточки будут возвращаться в очередь.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Лимит новых карточек в день</span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3"
              inputMode="numeric"
              onChange={(event) => {
                setForm((current) => (current ? { ...current, newCardsPerDay: event.target.value } : current));
                setSuccessMessage("");
              }}
              type="number"
              value={form.newCardsPerDay}
            />
          </label>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Лимит повторений в день</span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={form.unlimitedReviews}
                inputMode="numeric"
                onChange={(event) => {
                  setForm((current) => (current ? { ...current, reviewsPerDay: event.target.value } : current));
                  setSuccessMessage("");
                }}
                type="number"
                value={form.reviewsPerDay}
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                checked={form.unlimitedReviews}
                onChange={(event) => {
                  setForm((current) => (current ? { ...current, unlimitedReviews: event.target.checked } : current));
                  setSuccessMessage("");
                }}
                type="checkbox"
              />
              Без лимита повторений
            </label>
          </div>
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {successMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={!isDirty || saving} type="submit">
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
          <p className="text-sm text-slate-600">Очередь применит новые лимиты при следующем открытии review.</p>
        </div>
      </form>
    </section>
  );
}
