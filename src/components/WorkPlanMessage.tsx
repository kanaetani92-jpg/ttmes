export type WorkPlan = {
  intro: string;
  today_action: {
    title: string;
    steps: string[];
    why_it_helps?: string;
    est_minutes?: number;
  };
  weekly_plan?: Array<{
    title: string;
    checklist: string[];
    when?: string;
    trigger_if_then?: string;
    est_minutes?: number;
  }>;
  obstacles_and_coping?: Array<{
    obstacle: string;
    plan: string;
  }>;
  motivation?: {
    pros_boost?: string[];
    reframing_examples?: string[];
  };
  review_form?: {
    daily?: Array<{
      type: string;
      label: string;
      min?: number;
      max?: number;
    }>;
    weekly?: Array<{
      type: string;
      label: string;
      min?: number;
      max?: number;
    }>;
  };
  safety_note?: string;
  meta?: {
    stage?: string;
    band_summary?: string;
    generation_notes?: string;
  };
};

type Props = {
  plan: WorkPlan;
};

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">{children}</h3>
);

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="ml-4 list-decimal space-y-1 text-gray-100">
    {steps.map((step, index) => (
      <li key={`${step}-${index}`}>{step}</li>
    ))}
  </ol>
);

const Checklist = ({ items }: { items: string[] }) => (
  <ul className="ml-4 list-disc space-y-1 text-gray-100">
    {items.map((item, index) => (
      <li key={`${item}-${index}`}>{item}</li>
    ))}
  </ul>
);

export function WorkPlanMessage({ plan }: Props) {
  return (
    <div className="space-y-4 text-left text-sm leading-relaxed">
      <div className="space-y-2">
        <SectionTitle>今週の狙い</SectionTitle>
        <p className="text-gray-100">{plan.intro}</p>
      </div>

      <div className="space-y-2">
        <SectionTitle>{plan.today_action.title}</SectionTitle>
        <StepList steps={plan.today_action.steps} />
        {plan.today_action.why_it_helps ? (
          <p className="text-gray-300">理由: {plan.today_action.why_it_helps}</p>
        ) : null}
        {typeof plan.today_action.est_minutes === 'number' ? (
          <p className="text-gray-400">目安: 約{plan.today_action.est_minutes}分</p>
        ) : null}
      </div>

      {plan.weekly_plan?.length ? (
        <div className="space-y-3">
          <SectionTitle>週間プラン</SectionTitle>
          <div className="space-y-4">
            {plan.weekly_plan.map((card, index) => (
              <div key={`${card.title}-${index}`} className="rounded-lg bg-white/5 p-3 text-gray-100">
                <h4 className="font-semibold text-white">{card.title}</h4>
                {card.when ? <p className="text-xs text-gray-400">タイミング: {card.when}</p> : null}
                {card.trigger_if_then ? (
                  <p className="mt-1 text-xs text-gray-400">If-Then: {card.trigger_if_then}</p>
                ) : null}
                {Array.isArray(card.checklist) && card.checklist.length ? (
                  <div className="mt-2">
                    <Checklist items={card.checklist} />
                  </div>
                ) : null}
                {typeof card.est_minutes === 'number' ? (
                  <p className="mt-2 text-xs text-gray-500">所要時間の目安: 約{card.est_minutes}分</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {plan.obstacles_and_coping?.length ? (
        <div className="space-y-2">
          <SectionTitle>想定される障害と対策</SectionTitle>
          <ul className="space-y-2 text-gray-100">
            {plan.obstacles_and_coping.map((item, index) => (
              <li key={`${item.obstacle}-${index}`} className="rounded-lg bg-white/5 p-3">
                <p className="font-semibold text-white">{item.obstacle}</p>
                <p className="text-sm text-gray-300">対策: {item.plan}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.motivation?.pros_boost?.length || plan.motivation?.reframing_examples?.length ? (
        <div className="space-y-2">
          <SectionTitle>モチベーション維持</SectionTitle>
          {plan.motivation?.pros_boost?.length ? (
            <div>
              <p className="text-xs font-semibold text-gray-300">Pros（取り組む理由）</p>
              <Checklist items={plan.motivation.pros_boost} />
            </div>
          ) : null}
          {plan.motivation?.reframing_examples?.length ? (
            <div>
              <p className="text-xs font-semibold text-gray-300">リフレーミング例</p>
              <Checklist items={plan.motivation.reframing_examples} />
            </div>
          ) : null}
        </div>
      ) : null}

      {plan.review_form?.daily?.length || plan.review_form?.weekly?.length ? (
        <div className="space-y-2">
          <SectionTitle>振り返りフォーム</SectionTitle>
          {plan.review_form?.daily?.length ? (
            <div>
              <p className="text-xs font-semibold text-gray-300">毎日</p>
              <ul className="ml-4 list-disc space-y-1 text-gray-100">
                {plan.review_form.daily.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    {item.type === 'scale'
                      ? `${item.label}（${item.min ?? 0}〜${item.max ?? 0}）`
                      : item.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {plan.review_form?.weekly?.length ? (
            <div>
              <p className="text-xs font-semibold text-gray-300">毎週</p>
              <ul className="ml-4 list-disc space-y-1 text-gray-100">
                {plan.review_form.weekly.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    {item.type === 'scale'
                      ? `${item.label}（${item.min ?? 0}〜${item.max ?? 0}）`
                      : item.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {plan.safety_note ? (
        <div className="space-y-1 rounded-lg bg-amber-500/10 p-3 text-amber-200">
          <SectionTitle>安全上の注意</SectionTitle>
          <p>{plan.safety_note}</p>
        </div>
      ) : null}

      {plan.meta && (plan.meta.stage || plan.meta.band_summary) ? (
        <div className="space-y-1 text-xs text-gray-400">
          {plan.meta.stage ? <p>ステージ: {plan.meta.stage}</p> : null}
          {plan.meta.band_summary ? <p>バンド要約: {plan.meta.band_summary}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

